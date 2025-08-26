const Vendor = require('../models/Vendor');

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.vendorRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if vendor already exists
    const existing = await Vendor.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Vendor already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const vendor = new Vendor({
      name,
      email,
      password: hashedPassword,
    });

    await vendor.save();

    res.status(201).json({ message: "Vendor registered successfully" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// LOGIN
exports.vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // JWT Token
    const token = jwt.sign({ id: vendor._id }, process.env.JWT_SECRET || "mysecret", {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

// GET ALL VENDORS
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch (err) {
    console.error("Fetch vendors error:", err);
    res.status(500).json({ error: "Server error while fetching vendors" });
  }
};

// GET SINGLE VENDOR
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE VENDOR
exports.deleteVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json({ message: "Vendor deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
