const Firm = require('../models/Firm');
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({ storage, fileFilter });

// Normalize array helper
const normalizeArray = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') return [input];
  return [];
};

const addFirm = async (req, res) => {
  try {
    let { firmName, area, category, region, offer } = req.body;

    category = normalizeArray(category);
    region = normalizeArray(region);

    if (!firmName || !area || !category.length || !region.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const image = req.file ? req.file.filename : undefined;

    const vendor = await Vendor.findById(req.vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (vendor.firm.length > 0) {
      return res.status(400).json({ message: "Vendor can have only one firm" });
    }

    const existingFirm = await Firm.findOne({ firmName });
    if (existingFirm) {
      return res.status(409).json({ message: "Firm name already exists" });
    }

    const firm = new Firm({
      firmName,
      area,
      category,
      region,
      offer,
      image,
      vendor: vendor._id
    });

    const savedFirm = await firm.save();

    vendor.firm.push(savedFirm._id);
    await vendor.save();

    return res.status(200).json({
      message: 'Firm added successfully',
      firmId: savedFirm._id,
      vendorFirmName: savedFirm.firmName
    });
  } catch (error) {
    console.error("Add Firm Error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const deleteFirmById = async (req, res) => {
  try {
    const firmId = req.params.firmId;
    const deletedFirm = await Firm.findByIdAndDelete(firmId);
    if (!deletedFirm) return res.status(404).json({ error: "Firm not found" });

    if (deletedFirm.image) {
      const imagePath = path.join(__dirname, '..', 'uploads', deletedFirm.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Image delete error:", err);
      });
    }

    const vendor = await Vendor.findById(deletedFirm.vendor);
    if (vendor) {
      vendor.firm = vendor.firm.filter(f => f.toString() !== firmId);
      await vendor.save();
    }

    return res.status(200).json({ message: "Firm deleted successfully" });
  } catch (error) {
    console.error("Delete Firm Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getFirmById = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id)
      .populate('vendor', 'username email')
      .populate('products');
    if (!firm) return res.status(404).json({ error: "Firm not found" });
    res.status(200).json(firm);
  } catch (error) {
    console.error("Get Firm Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addFirm: [upload.single('image'), addFirm],
  deleteFirmById,
  getFirmById
};
