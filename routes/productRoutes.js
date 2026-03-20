const express = require('express');
const productController = require("../controllers/productController");
const path = require('path');
const router = express.Router();

router.post('/add-product/:firmId', productController.addProduct);
router.get('/:firmId/products', productController.getProductByFirm);
router.put('/:productId', productController.updateProductById);   // ← NEW
router.delete('/:productId', productController.deleteProductById);

router.get('/uploads/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    res.header('Content-Type', 'image/jpeg');
    res.sendFile(path.join(__dirname, '..', 'uploads', imageName));
});

module.exports = router;
