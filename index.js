const express = require("express");
require('dotenv').config();
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const vendorRoutes  = require('./routes/vendorRoutes');
const firmRoutes    = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI || !process.env.WhatIsYourName) {
  console.error("ERROR: Missing MONGO_URI or WhatIsYourName in environment.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => { console.error("MongoDB error:", err); process.exit(1); });

// ── Mount routes ─────────────────────────────────────────────────────────────
app.use('/vendor',  vendorRoutes);
app.use('/firm',    firmRoutes);
app.use('/product', productRoutes);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    routes: [
      'POST   /vendor/register',
      'POST   /vendor/login',
      'GET    /vendor/all-vendors',
      'GET    /vendor/single-vendor/:id',
      'POST   /firm/add-firm',
      'PUT    /firm/update-firm/:firmId',   // ← confirm this shows up
      'DELETE /firm/:firmId',
      'GET    /firm/:id',
      'GET    /firm/ping',
      'POST   /product/add-product/:firmId',
      'GET    /product/:firmId/products',
      'PUT    /product/:productId',
      'DELETE /product/:productId',
    ]
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', attempted: `${req.method} ${req.originalUrl}` });
});

app.listen(PORT, () => console.log(`✅ Server on port ${PORT}`));
