// controllers/passwordController.js
// Add this to the backend

const Vendor = require('../models/Vendor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const secretKey = process.env.WhatIsYourName;

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const vendor = await Vendor.findById(req.vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, vendor.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    vendor.password = hashed;
    await vendor.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { changePassword };

/* 
  ADD TO vendorRoutes.js:
  
  const { changePassword } = require('../controllers/passwordController');
  const verifyToken = require('../middlewares/verifyToken');
  
  router.put('/change-password', verifyToken, changePassword);
*/
