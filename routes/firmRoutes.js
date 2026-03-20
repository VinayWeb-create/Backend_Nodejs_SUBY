const express = require('express');
const firmController = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');
const path = require('path');

const router = express.Router();

router.post('/add-firm',         verifyToken, firmController.addFirm);
router.put('/update-firm/:firmId', verifyToken, firmController.updateFirm);
router.delete('/:firmId',        verifyToken, firmController.deleteFirmById);
router.get('/:id',                             firmController.getFirmById);

// Serve local uploads (dev only)
router.get('/uploads/:imageName', (req, res) => {
  const imagePath = path.join(__dirname, '..', 'uploads', req.params.imageName);
  res.sendFile(imagePath, (err) => {
    if (err) res.status(404).json({ message: 'Image not found' });
  });
});

module.exports = router;
