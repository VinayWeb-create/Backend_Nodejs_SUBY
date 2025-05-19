const express = require("express");
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const vendorRoutes = require('./routes/vendorRoutes');
const firmRoutes = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
dotEnv.config();

// ✅ Set your frontend URL from Vercel here


app.use(cors({
  origin: ['https://backend-nodejs-suby-1-54sr.onrender.com'],
  // your frontend URL here
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // if you are using cookies or auth headers
}));


const PORT = process.env.PORT || 5000;

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => console.log(error));

// ✅ Middleware
app.use(bodyParser.json());
app.use('/vendor', vendorRoutes);
app.use('/firm', firmRoutes);
app.use('/product', productRoutes);
app.use('/uploads', express.static('uploads'));

// ✅ Root route
app.get('/', (req, res) => {
  res.send("<h1> Welcome to SUBY </h1>");
});

// ✅ Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`server started and running at ${PORT}`);
});

