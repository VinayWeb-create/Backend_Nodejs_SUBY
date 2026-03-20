const express = require("express");
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const vendorRoutes  = require('./routes/vendorRoutes');
const firmRoutes    = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// Validate required env vars
if (!process.env.MONGO_URI || !process.env.WhatIsYourName) {
  console.error("ERROR: Missing MONGO_URI or WhatIsYourName in environment.");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => { console.error("MongoDB connection error:", error); process.exit(1); });

// Routes
app.use('/vendor',  vendorRoutes);
app.use('/firm',    firmRoutes);
app.use('/product', productRoutes);

// Debug: print all registered routes on startup
app._router.stack.forEach((r) => {
  if (r.handle && r.handle.stack) {
    r.handle.stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        console.log(`[ROUTE] ${methods} ${r.regexp} ${layer.route.path}`);
      }
    });
  }
});

app.get('/', (req, res) => {
  res.send("<h1>SUBY Backend Running</h1><p>Routes: /vendor, /firm, /product</p>");
});

app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
