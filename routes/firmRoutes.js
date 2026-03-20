const express = require('express');
const firmController = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');
const path = require('path');

const router = express.Router();

// ── IMPORTANT: specific routes must come BEFORE param routes ──
router.post('/add-firm',              verifyToken, firmController.addFirm);
router.put('/update-firm/:firmId',    verifyToken, firmController.updateFirm);

// Local image serving (dev only)
router.get('/uploads/:imageName', (req, res) => {
  const imagePath = path.join(__dirname, '..', 'uploads', req.params.imageName);
  res.sendFile(imagePath, (err) => {
    if (err) res.status(404).json({ message: 'Image not found' });
  });
});

router.delete('/:firmId', verifyToken, firmController.deleteFirmById);
router.get('/:id',                    firmController.getFirmById);

module.exports = router;
