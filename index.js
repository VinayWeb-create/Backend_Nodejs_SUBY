const express = require("express");
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const vendorRoutes = require('./routes/vendorRoutes');
const firmRoutes = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
dotEnv.config();

console.log("MONGO_URI is:", process.env.MONGO_URI ? "Loaded" : "NOT Loaded");

app.use(cors({
  origin: '*',  // temporarily allow all, then lock down to your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully!"))
.catch((error) => console.log("MongoDB connection error:", error));

app.use(bodyParser.json());
app.use('/vendor', vendorRoutes);
app.use('/firm', firmRoutes);
app.use('/product', productRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send("<h1> Welcome to SUBY </h1>");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`server started and running at ${PORT}`);
});
