const Firm = require('../models/Firm');
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/* ===========================
   CLOUDINARY CONFIG
=========================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

console.log(`[Firm Images] Using ${useCloudinary ? 'Cloudinary ☁️' : 'local disk 💾'} storage`);

/* ===========================
   MULTER STORAGE
=========================== */
let upload;

if (useCloudinary) {
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'suby-firms',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
  });
  upload = multer({ storage: cloudStorage, limits: { fileSize: 5 * 1024 * 1024 } });
} else {
  const localDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, localDir),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  });
  upload = multer({
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
      /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
        ? cb(null, true)
        : cb(new Error('Only image files are allowed!'));
    },
  });
}

/* ===========================
   HELPERS
=========================== */
const getImageUrl = (file) => {
  if (!file) return undefined;
  return useCloudinary ? file.path : file.filename;
};

const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;
  if (useCloudinary && imageUrl.startsWith('http')) {
    try {
      const parts      = imageUrl.split('/');
      const fileWithExt = parts[parts.length - 1];
      const publicId   = `suby-firms/${fileWithExt.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Cloudinary firm image delete error:', err.message);
    }
  } else if (!imageUrl.startsWith('http')) {
    const localPath = path.join(__dirname, '..', 'uploads', imageUrl);
    fs.unlink(localPath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('Local firm image delete failed:', err.message);
    });
  }
};

const normalizeArray = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string' && input) return [input];
  return [];
};

/* ===========================
   ADD FIRM
=========================== */
const addFirm = async (req, res) => {
  try {
    let { firmName, area, category, region, offer } = req.body;
    category = normalizeArray(category);
    region   = normalizeArray(region);

    if (!firmName || !area || !category.length || !region.length) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const vendor = await Vendor.findById(req.vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    if (vendor.firm.length > 0) {
      return res.status(400).json({ message: 'Vendor can have only one firm' });
    }

    const existingFirm = await Firm.findOne({ firmName });
    if (existingFirm) return res.status(409).json({ message: 'Firm name already exists' });

    const firm = new Firm({
      firmName, area, category, region, offer,
      image: getImageUrl(req.file),
      vendor: vendor._id,
    });

    const savedFirm = await firm.save();
    vendor.firm.push(savedFirm._id);
    await vendor.save();

    return res.status(200).json({
      message: 'Firm added successfully',
      firmId: savedFirm._id,
      vendorFirmName: savedFirm.firmName,
    });
  } catch (error) {
    console.error('Add Firm Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/* ===========================
   UPDATE FIRM
=========================== */
const updateFirm = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ message: 'Firm not found' });

    // Make sure this firm belongs to the logged-in vendor
    if (firm.vendor.toString() !== req.vendorId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this firm' });
    }

    const { firmName, area, category, region, offer } = req.body;

    if (firmName  !== undefined) firm.firmName = firmName;
    if (area      !== undefined) firm.area     = area;
    if (offer     !== undefined) firm.offer    = offer;

    if (category !== undefined) firm.category = normalizeArray(category);
    if (region   !== undefined) firm.region   = normalizeArray(region);

    // Handle new image
    if (req.file) {
      await deleteImage(firm.image);
      firm.image = getImageUrl(req.file);
    }

    const updatedFirm = await firm.save();

    // Also update firmName in localStorage-friendly response
    return res.status(200).json({
      message: 'Firm updated successfully',
      firm: updatedFirm,
      vendorFirmName: updatedFirm.firmName,
    });
  } catch (error) {
    console.error('Update Firm Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/* ===========================
   GET FIRM BY ID
=========================== */
const getFirmById = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id)
      .populate('vendor', 'username email')
      .populate('products');
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.status(200).json(firm);
  } catch (error) {
    console.error('Get Firm Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ===========================
   DELETE FIRM
=========================== */
const deleteFirmById = async (req, res) => {
  try {
    const firmId      = req.params.firmId;
    const deletedFirm = await Firm.findByIdAndDelete(firmId);
    if (!deletedFirm) return res.status(404).json({ error: 'Firm not found' });

    await deleteImage(deletedFirm.image);

    const vendor = await Vendor.findById(deletedFirm.vendor);
    if (vendor) {
      vendor.firm = vendor.firm.filter(f => f.toString() !== firmId);
      await vendor.save();
    }

    return res.status(200).json({ message: 'Firm deleted successfully' });
  } catch (error) {
    console.error('Delete Firm Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addFirm:       [upload.single('image'), addFirm],
  updateFirm:    [upload.single('image'), updateFirm],
  deleteFirmById,
  getFirmById,
};
