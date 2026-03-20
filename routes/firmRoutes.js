const express     = require('express');
const controller  = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[firmRoutes] ${req.method} ${req.path}`);
  next();
});

router.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'firm routes alive v2' });
});

router.post('/add-firm',           verifyToken, controller.addFirm);
router.put('/update-firm/:firmId', verifyToken, controller.updateFirm);
router.delete('/:firmId',          verifyToken, controller.deleteFirmById);
router.get('/:id',                             controller.getFirmById);

module.exports = router;
