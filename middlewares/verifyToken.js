const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Vendor = require('../models/Vendor');

dotenv.config();

const secretKey = process.env.JWT_SECRET; // make sure .env has JWT_SECRET

if (!secretKey) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}

const verifyToken = async (req, res, next) => {
  // support both custom header and standard Authorization
  let token = req.headers.token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    const vendor = await Vendor.findById(decoded.vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    req.vendorId = vendor._id;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
