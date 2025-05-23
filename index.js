const express = require("express");
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const vendorRoutes = require('./routes/vendorRoutes');
const firmRoutes = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
dotenv.config();

console.log("MONGO_URI is:", process.env.MONGO_URI ? "Loaded" : "NOT Loaded");

app.use(cors({
  origin: '*',  // Change to your frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => console.error("MongoDB connection error:", error));

app.use(bodyParser.json());

app.use('/vendor', vendorRoutes);
app.use('/firm', firmRoutes);
app.use('/product', productRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send("<h1> Welcome to SUBY </h1>");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started and running on port ${PORT}`);
});
