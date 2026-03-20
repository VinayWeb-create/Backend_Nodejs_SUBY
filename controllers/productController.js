const Product = require("../models/Product");
const Firm = require("../models/Firm");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ===========================
   1️⃣ ENSURE uploads FOLDER EXISTS
=========================== */
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ===========================
   2️⃣ MULTER CONFIG
=========================== */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ===========================
   3️⃣ ADD PRODUCT
=========================== */
const addProduct = async (req, res) => {
  try {
    const { productName, price, category, bestSeller, description } = req.body;

    if (!productName || !price) {
      return res.status(400).json({ error: "Product name and price are required" });
    }

    const firm = await Firm.findById(req.params.firmId);
    if (!firm) {
      return res.status(404).json({ error: "Firm not found" });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const product = new Product({
      productName,
      price,
      category,
      bestSeller,
      description,
      image,
      firm: firm._id,
    });

    const savedProduct = await product.save();

    firm.products.push(savedProduct._id);
    await firm.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===========================
   4️⃣ GET PRODUCTS BY FIRM
=========================== */
const getProductByFirm = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.firmId);
    if (!firm) {
      return res.status(404).json({ error: "Firm not found" });
    }

    const products = await Product.find({ firm: firm._id });

    res.status(200).json({
      firmName: firm.firmName,
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===========================
   5️⃣ UPDATE PRODUCT
=========================== */
const updateProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { productName, price, description, bestSeller, category } = req.body;

    // If a new image was uploaded, delete the old one
    if (req.file) {
      if (product.image) {
        const oldImagePath = path.join(__dirname, "..", product.image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Old image delete failed:", err.message);
        });
      }
      product.image = `/uploads/${req.file.filename}`;
    }

    if (productName !== undefined) product.productName = productName;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (bestSeller !== undefined) product.bestSeller = bestSeller === 'true' || bestSeller === true;

    // category can come as array or comma-separated string
    if (category !== undefined) {
      if (Array.isArray(category)) {
        product.category = category;
      } else if (typeof category === 'string') {
        product.category = category ? [category] : [];
      }
    }

    const updatedProduct = await product.save();

    res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===========================
   6️⃣ DELETE PRODUCT + IMAGE
=========================== */
const deleteProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.image) {
      const imagePath = path.join(__dirname, "..", product.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Image delete failed:", err.message);
      });
    }

    await Product.findByIdAndDelete(req.params.productId);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===========================
   7️⃣ EXPORTS
=========================== */
module.exports = {
  addProduct: [upload.single("image"), addProduct],
  getProductByFirm,
  updateProductById: [upload.single("image"), updateProductById],  // multer handles file
  deleteProductById,
};
