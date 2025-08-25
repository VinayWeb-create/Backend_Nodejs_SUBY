const express = require("express");
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const vendorRoutes = require('./routes/vendorRoutes');
const firmRoutes = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.REACT_APP_API_URL || "http://localhost:5000";


// Validate required env vars early
if (!process.env.MONGO_URI || !process.env.WhatIsYourName) {
  console.error("ERROR: Missing MONGO_URI or JWT_SECRET in environment."); 
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json()); // built-in instead of body-parser
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Routes
app.use('/vendor', vendorRoutes);
app.use('/firm', firmRoutes);
app.use('/product', productRoutes);

// Root & fallback
app.get('/', (req, res) => {
  res.send("<h1>🎉 Welcome to SUBY</h1><p>Use /vendor, /firm, or /product routes</p>");
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server started and running at http://localhost:${PORT}`);
});
