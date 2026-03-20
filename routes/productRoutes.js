const express = require('express');
const productController = require("../controllers/productController");
const path = require('path');
const router = express.Router();

router.post('/add-product/:firmId', productController.addProduct);
router.get('/:firmId/products',     productController.getProductByFirm);
router.put('/:productId',           productController.updateProductById);
router.delete('/:productId',        productController.deleteProductById);

// Serve local uploads (only used in dev when Cloudinary is not configured)
router.get('/uploads/:imageName', (req, res) => {
  const imagePath = path.join(__dirname, '..', 'uploads', req.params.imageName);
  res.sendFile(imagePath, (err) => {
    if (err) res.status(404).json({ message: 'Image not found' });
  });
});

module.exports = router;
