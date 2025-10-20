const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotEnv = require('dotenv');

dotEnv.config();

const secretKey = process.env.WhatIsYourName;

// ---------------- REGISTER ----------------
const vendorRegister = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await Vendor.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newVendor = new Vendor({
      username,
      email,
      password: hashedPassword,
    });

    await newVendor.save();
    res.status(201).json({ message: "Vendor registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- LOGIN ----------------
const vendorLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const vendor = await Vendor.findOne({ email })
      .populate({
        path: 'firm',
        populate: {
          path: 'products',
        },
      });

    if (!vendor || !(await bcrypt.compare(password, vendor.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ vendorId: vendor._id }, secretKey, { expiresIn: "2h" });

    const vendorObj = vendor.toObject();
    vendorObj.primaryFirm = vendor.firm?.[0] || { _id: null, firmName: "" };

    res.status(200).json({
      success: "Login successful",
      token,
      vendorId: vendor._id,
      vendor: vendorObj,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- GET ALL ----------------
const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().populate('firm');
    res.json({ vendors });
  } catch (error) {
    console.error("Get all vendors error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- GET BY ID ----------------
const getVendorById = async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: "Vendor ID is required and must be valid." });
  }

  try {
    const vendor = await Vendor.findById(id)
      .populate({
        path: 'firm',
        populate: {
          path: 'products',
        },
      });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorObj = vendor.toObject();
    vendorObj.primaryFirm = vendor.firm?.[0] || null;

    res.status(200).json(vendorObj);
  } catch (err) {
    console.error("Get vendor by ID error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- DELETE ----------------
const deleteVendorById = async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: "Vendor ID is required and must be valid." });
  }

  try {
    const deletedVendor = await Vendor.findByIdAndDelete(id);
    if (!deletedVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (err) {
    console.error("Delete vendor error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- PROFILE (for UserDetails.jsx) ----------------
const getVendorProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token missing" });

    const decoded = jwt.verify(token, secretKey);
    const vendor = await Vendor.findById(decoded.vendorId)
      .populate({
        path: 'firm',
        populate: { path: 'products' },
      });

    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorObj = vendor.toObject();
    vendorObj.primaryFirm = vendor.firm?.[0] || null;

    res.status(200).json({ vendor: vendorObj });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ---------------- EXPORT ----------------
module.exports = {
  vendorRegister,
  vendorLogin,
  getAllVendors,
  getVendorById,
  deleteVendorById,
  getVendorProfile,
};
