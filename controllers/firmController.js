const Firm   = require('../models/Firm');
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/* ══════════════════════════════════════
   CLOUDINARY CONFIG
   Env vars set in Render dashboard:
     CLOUDINARY_CLOUD_NAME
     CLOUDINARY_API_KEY
     CLOUDINARY_API_SECRET
══════════════════════════════════════ */
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

console.log(`[Firm] Image storage: ${useCloudinary ? 'Cloudinary ☁️' : 'local disk 💾'}`);

/* ══════════════════════════════════════
   MULTER SETUP
══════════════════════════════════════ */
let upload;

if (useCloudinary) {
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:           'suby-firms',
      allowed_formats:  ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation:   [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
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
        : cb(new Error('Only image files are allowed'));
    },
  });
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */

// Get storable image value from uploaded file
const getImageUrl = (file) => {
  if (!file) return undefined;
  // Cloudinary: file.path = full https URL
  // Local disk: file.filename = bare filename
  return useCloudinary ? file.path : file.filename;
};

// Delete old image when replacing
const deleteOldImage = async (imageUrl) => {
  if (!imageUrl) return;

  if (useCloudinary && imageUrl.startsWith('http')) {
    try {
      // Extract public_id from URL: last segment without extension
      const segments   = imageUrl.split('/');
      const fileWithExt = segments[segments.length - 1];
      const publicId   = `suby-firms/${fileWithExt.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Cloudinary delete error:', err.message);
    }
  } else if (imageUrl && !imageUrl.startsWith('http')) {
    // Local file
    const localPath = path.join(__dirname, '..', 'uploads', imageUrl);
    fs.unlink(localPath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('Local image delete error:', err.message);
    });
  }
};

const normalizeArray = (input) => {
  if (Array.isArray(input))              return input.filter(Boolean);
  if (typeof input === 'string' && input) return [input];
  return [];
};

/* ══════════════════════════════════════
   ADD FIRM
══════════════════════════════════════ */
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

    const image     = getImageUrl(req.file);
    const savedFirm = await new Firm({
      firmName, area, category, region, offer, image, vendor: vendor._id,
    }).save();

    vendor.firm.push(savedFirm._id);
    await vendor.save();

    return res.status(200).json({
      message:        'Firm added successfully',
      firmId:         savedFirm._id,
      vendorFirmName: savedFirm.firmName,
    });
  } catch (error) {
    console.error('Add Firm Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/* ══════════════════════════════════════
   UPDATE FIRM   ← PUT /firm/update-firm/:firmId
══════════════════════════════════════ */
const updateFirm = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ message: 'Firm not found' });

    // Ownership check
    if (firm.vendor.toString() !== req.vendorId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this firm' });
    }

    const { firmName, area, category, region, offer } = req.body;

    if (firmName !== undefined) firm.firmName = firmName;
    if (area     !== undefined) firm.area     = area;
    if (offer    !== undefined) firm.offer    = offer;

    if (category !== undefined) firm.category = normalizeArray(category);
    if (region   !== undefined) firm.region   = normalizeArray(region);

    // Replace image if a new file was uploaded
    if (req.file) {
      await deleteOldImage(firm.image);
      firm.image = getImageUrl(req.file);
    }

    const updated = await firm.save();

    return res.status(200).json({
      message:        'Firm updated successfully',
      firm:           updated,
      vendorFirmName: updated.firmName,
    });
  } catch (error) {
    console.error('Update Firm Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/* ══════════════════════════════════════
   GET FIRM BY ID
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   DELETE FIRM
══════════════════════════════════════ */
const deleteFirmById = async (req, res) => {
  try {
    const deletedFirm = await Firm.findByIdAndDelete(req.params.firmId);
    if (!deletedFirm) return res.status(404).json({ error: 'Firm not found' });

    await deleteOldImage(deletedFirm.image);

    const vendor = await Vendor.findById(deletedFirm.vendor);
    if (vendor) {
      vendor.firm = vendor.firm.filter(f => f.toString() !== req.params.firmId);
      await vendor.save();
    }

    return res.status(200).json({ message: 'Firm deleted successfully' });
  } catch (error) {
    console.error('Delete Firm Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ══════════════════════════════════════
   EXPORTS
══════════════════════════════════════ */
module.exports = {
  addFirm:       [upload.single('image'), addFirm],
  updateFirm:    [upload.single('image'), updateFirm],
  getFirmById,
  deleteFirmById,
};
