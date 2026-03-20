const Product = require("../models/Product");
const Firm = require("../models/Firm");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

/* ===========================
   CLOUDINARY CONFIG
   Add these in Render dashboard → Environment:
     CLOUDINARY_CLOUD_NAME
     CLOUDINARY_API_KEY
     CLOUDINARY_API_SECRET
=========================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

console.log(`[Images] Using ${useCloudinary ? "Cloudinary ☁️" : "local disk 💾"} storage`);

/* ===========================
   MULTER STORAGE SETUP
=========================== */
let uploadMiddleware;

if (useCloudinary) {
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "suby-products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    },
  });
  uploadMiddleware = multer({ storage: cloudStorage, limits: { fileSize: 5 * 1024 * 1024 } }).single("image");
} else {
  // Local fallback (for development only – files lost on Render restart!)
  const localDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, localDir),
    filename:    (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
  });
  uploadMiddleware = multer({
    storage: diskStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
        ? cb(null, true)
        : cb(new Error("Only image files are allowed"));
    },
  }).single("image");
}

/* ===========================
   HELPER: get image URL from req.file
=========================== */
const getImageUrl = (file) => {
  if (!file) return null;
  // Cloudinary: file.path is the full https URL
  // Local disk: file.filename is just the name
  return useCloudinary ? file.path : `/uploads/${file.filename}`;
};

/* ===========================
   HELPER: delete old image
=========================== */
const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;

  if (useCloudinary && imageUrl.startsWith("http")) {
    try {
      // URL format: .../suby-products/publicid.ext
      const urlParts = imageUrl.split("/");
      const fileWithExt = urlParts[urlParts.length - 1];
      const publicId = `suby-products/${fileWithExt.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Cloudinary delete error:", err.message);
    }
  } else if (imageUrl.startsWith("/uploads/")) {
    const localPath = path.join(__dirname, "..", imageUrl);
    fs.unlink(localPath, (err) => {
      if (err && err.code !== "ENOENT") console.error("Local image delete failed:", err.message);
    });
  }
};

/* ===========================
   ADD PRODUCT
=========================== */
const addProduct = async (req, res) => {
  try {
    const { productName, price, category, bestSeller, description } = req.body;

    if (!productName || !price) {
      return res.status(400).json({ error: "Product name and price are required" });
    }

    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ error: "Firm not found" });

    let categoryArr = [];
    if (Array.isArray(category)) categoryArr = category;
    else if (typeof category === "string" && category) categoryArr = [category];

    const product = new Product({
      productName,
      price,
      category: categoryArr,
      bestSeller: bestSeller === "true" || bestSeller === true,
      description,
      image: getImageUrl(req.file),
      firm: firm._id,
    });

    const savedProduct = await product.save();
    firm.products.push(savedProduct._id);
    await firm.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ error: "Internal server error", detail: error.message });
  }
};

/* ===========================
   GET PRODUCTS BY FIRM
=========================== */
const getProductByFirm = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ error: "Firm not found" });

    const products = await Product.find({ firm: firm._id });
    res.status(200).json({ firmName: firm.firmName, products });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===========================
   UPDATE PRODUCT
=========================== */
const updateProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { productName, price, description, bestSeller, category } = req.body;

    if (req.file) {
      await deleteImage(product.image);
      product.image = getImageUrl(req.file);
    }

    if (productName  !== undefined) product.productName = productName;
    if (price        !== undefined) product.price = price;
    if (description  !== undefined) product.description = description;
    if (bestSeller   !== undefined) product.bestSeller = bestSeller === "true" || bestSeller === true;

    if (category !== undefined) {
      if (Array.isArray(category))           product.category = category;
      else if (typeof category === "string") product.category = category ? [category] : [];
    }

    const updated = await product.save();
    res.status(200).json({ message: "Product updated successfully", product: updated });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ error: "Internal server error", detail: error.message });
  }
};

/* ===========================
   DELETE PRODUCT
=========================== */
const deleteProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await deleteImage(product.image);
    await Product.findByIdAndDelete(req.params.productId);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===========================
   EXPORTS
=========================== */
module.exports = {
  addProduct:        [uploadMiddleware, addProduct],
  getProductByFirm,
  updateProductById: [uploadMiddleware, updateProductById],
  deleteProductById,
};
