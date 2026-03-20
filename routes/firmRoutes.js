const express     = require('express');
const controller  = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// ── DEBUG: log every request that hits /firm/* ──────────────────────────────
router.use((req, res, next) => {
  console.log(`[firmRoutes] ${req.method} ${req.path}`);
  next();
});

// ── TEST route (no auth needed) — hit this to confirm new code is deployed ──
// GET /firm/ping  →  should return { ok: true, message: "firm routes alive" }
router.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'firm routes alive' });
});

// ── STATIC / SPECIFIC routes first ─────────────────────────────────────────
router.post('/add-firm',           verifyToken, controller.addFirm);
router.put('/update-firm/:firmId', verifyToken, controller.updateFirm);

// ── DYNAMIC param routes last ───────────────────────────────────────────────
router.delete('/:firmId', verifyToken, controller.deleteFirmById);
router.get('/:id',                    controller.getFirmById);

module.exports = router;
