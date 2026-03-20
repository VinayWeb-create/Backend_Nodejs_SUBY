const Product = require("../models/Product");
const Firm    = require("../models/Firm");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

/* ══════════════════════════════════════
   CLOUDINARY CONFIG
══════════════════════════════════════ */
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

console.log(`[Product] Storage: ${useCloudinary ? "Cloudinary ☁️" : "local disk 💾"}`);

/* ══════════════════════════════════════
   MULTER
══════════════════════════════════════ */
let uploadMiddleware;

if (useCloudinary) {
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          "suby-products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation:  [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    },
  });
  uploadMiddleware = multer({ storage: cloudStorage, limits: { fileSize: 5 * 1024 * 1024 } }).single("image");
} else {
  const localDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const disk = multer.diskStorage({
    destination: (req, file, cb) => cb(null, localDir),
    filename:    (req, file, cb) =>
      cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
  });
  uploadMiddleware = multer({
    storage: disk,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
        ? cb(null, true) : cb(new Error("Only image files are allowed"));
    },
  }).single("image");
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
const getImageUrl = (file) => {
  if (!file) return null;
  return useCloudinary ? file.path : `/uploads/${file.filename}`;
};

const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;
  if (useCloudinary && imageUrl.startsWith("http")) {
    try {
      const seg      = imageUrl.split("/");
      const publicId = `suby-products/${seg[seg.length - 1].split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (e) { console.error("Cloudinary delete:", e.message); }
  } else if (imageUrl.startsWith("/uploads/")) {
    fs.unlink(path.join(__dirname, "..", imageUrl), () => {});
  }
};

const toArr = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);

/* ══════════════════════════════════════
   ADD PRODUCT
══════════════════════════════════════ */
const addProduct = async (req, res) => {
  try {
    const { productName, price, category, cuisine, bestSeller, description } = req.body;

    if (!productName || !price)
      return res.status(400).json({ error: "Product name and price are required" });

    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ error: "Firm not found" });

    const product = new Product({
      productName,
      price,
      category:   toArr(category),
      cuisine:    toArr(cuisine),
      bestSeller: bestSeller === "true" || bestSeller === true,
      description,
      image:      getImageUrl(req.file),
      firm:       firm._id,
    });

    const saved = await product.save();
    firm.products.push(saved._id);
    await firm.save();

    res.status(201).json(saved);
  } catch (e) {
    console.error("addProduct:", e);
    res.status(500).json({ error: "Internal server error", detail: e.message });
  }
};

/* ══════════════════════════════════════
   GET PRODUCTS BY FIRM
══════════════════════════════════════ */
const getProductByFirm = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ error: "Firm not found" });
    const products = await Product.find({ firm: firm._id });
    res.status(200).json({ firmName: firm.firmName, products });
  } catch (e) {
    console.error("getProductByFirm:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ══════════════════════════════════════
   UPDATE PRODUCT
══════════════════════════════════════ */
const updateProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { productName, price, description, bestSeller, category, cuisine } = req.body;

    if (req.file) {
      await deleteImage(product.image);
      product.image = getImageUrl(req.file);
    }

    if (productName  !== undefined) product.productName = productName;
    if (price        !== undefined) product.price       = price;
    if (description  !== undefined) product.description = description;
    if (bestSeller   !== undefined) product.bestSeller  = bestSeller === "true" || bestSeller === true;
    if (category     !== undefined) product.category    = toArr(category);
    if (cuisine      !== undefined) product.cuisine     = toArr(cuisine);

    const updated = await product.save();
    res.status(200).json({ message: "Product updated successfully", product: updated });
  } catch (e) {
    console.error("updateProductById:", e);
    res.status(500).json({ error: "Internal server error", detail: e.message });
  }
};

/* ══════════════════════════════════════
   DELETE PRODUCT
══════════════════════════════════════ */
const deleteProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    await deleteImage(product.image);
    await Product.findByIdAndDelete(req.params.productId);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (e) {
    console.error("deleteProductById:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ══════════════════════════════════════
   EXPORTS
══════════════════════════════════════ */
module.exports = {
  addProduct:        [uploadMiddleware, addProduct],
  getProductByFirm,
  updateProductById: [uploadMiddleware, updateProductById],
  deleteProductById,
};
