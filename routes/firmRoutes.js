const express = require('express');
const firmController = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');
const path = require('path');

const router = express.Router();

/**
 * @route POST /firm/add-firm
 * @desc Add a new firm (requires authentication)
 */
router.post('/add-firm', verifyToken, firmController.addFirm);

/**
 * @route GET /firm/uploads/:imageName
 * @desc Serve firm images
 */
router.get('/uploads/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, '..', 'uploads', imageName);

  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Image not found' });
    }
  });
});

/**
 * @route DELETE /firm/:firmId
 * @desc Delete a firm by ID (requires authentication)
 */
router.delete('/:firmId', verifyToken, firmController.deleteFirmById);

module.exports = router;
