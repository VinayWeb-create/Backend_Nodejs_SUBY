const vendorController = require('../controllers/vendorController');
const express = require('express');
const path = require('path');
const { changePassword } = require('../controllers/passwordController');
const verifyToken = require('../middlewares/verifyToken');
const router = express.Router();


router.post('/register', vendorController.vendorRegister);
router.post('/login', vendorController.vendorLogin);

router.get('/all-vendors', vendorController.getAllVendors);
router.get('/single-vendor/:id', vendorController.getVendorById);
router.delete('/vendors/:id', vendorController.deleteVendorById);
router.get("/profile", vendorController.getVendorProfile);
router.put('/change-password', verifyToken, changePassword);
module.exports = router;
