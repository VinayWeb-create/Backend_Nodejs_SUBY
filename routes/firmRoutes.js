const express    = require('express');
const controller = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// ─── ORDER MATTERS ───────────────────────────────────────────────────────────
// Static/specific paths MUST come before dynamic /:param paths
// otherwise Express matches "update-firm" as the value of :firmId or :id
// ─────────────────────────────────────────────────────────────────────────────

// POST   /firm/add-firm
router.post('/add-firm', verifyToken, controller.addFirm);

// PUT    /firm/update-firm/:firmId
router.put('/update-firm/:firmId', verifyToken, controller.updateFirm);

// DELETE /firm/:firmId
router.delete('/:firmId', verifyToken, controller.deleteFirmById);

// GET    /firm/:id
router.get('/:id', controller.getFirmById);

module.exports = router;
