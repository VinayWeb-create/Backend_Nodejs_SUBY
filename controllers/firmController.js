const Firm    = require('../models/Firm');
const Vendor  = require('../models/Vendor');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/* ══════════════════════════════════════════
   CLOUDINARY CONFIG
══════════════════════════════════════════ */
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

console.log(`[Firm] Storage: ${useCloudinary ? 'Cloudinary ☁️' : 'Local disk 💾'}`);

/* ══════════════════════════════════════════
   MULTER
══════════════════════════════════════════ */
let upload;

if (useCloudinary) {
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          'suby-firms',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation:  [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
  });
  upload = multer({ storage: cloudStorage, limits: { fileSize: 5 * 1024 * 1024 } });
} else {
  const localDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const disk = multer.diskStorage({
    destination: (req, file, cb) => cb(null, localDir),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  });
  upload = multer({ storage: disk, limits: { fileSize: 5 * 1024 * 1024 } });
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const getImageUrl = (file) => {
  if (!file) return undefined;
  // Cloudinary stores full https URL in file.path
  // local disk stores filename only
  return useCloudinary ? file.path : file.filename;
};

const deleteOldImage = async (imageUrl) => {
  if (!imageUrl) return;
  if (imageUrl.startsWith('http') && useCloudinary) {
    try {
      const seg      = imageUrl.split('/');
      const publicId = `suby-firms/${seg[seg.length - 1].split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (e) { console.error('Cloudinary delete:', e.message); }
  } else if (!imageUrl.startsWith('http')) {
    fs.unlink(path.join(__dirname, '..', 'uploads', imageUrl), () => {});
  }
};

const toArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);

/* ══════════════════════════════════════════
   ADD FIRM
══════════════════════════════════════════ */
const addFirm = async (req, res) => {
  try {
    const { firmName, area, offer } = req.body;
    const category = toArr(req.body.category);
    const region   = toArr(req.body.region);

    if (!firmName || !area || !category.length || !region.length)
      return res.status(400).json({ message: 'Missing required fields' });

    const vendor = await Vendor.findById(req.vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.firm.length > 0)
      return res.status(400).json({ message: 'Vendor can have only one firm' });

    if (await Firm.findOne({ firmName }))
      return res.status(409).json({ message: 'Firm name already exists' });

    const firm = await new Firm({
      firmName, area, category, region, offer,
      image:  getImageUrl(req.file),
      vendor: vendor._id,
    }).save();

    vendor.firm.push(firm._id);
    await vendor.save();

    return res.status(200).json({
      message:        'Firm added successfully',
      firmId:         firm._id,
      vendorFirmName: firm.firmName,
    });
  } catch (e) {
    console.error('addFirm:', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/* ══════════════════════════════════════════
   UPDATE FIRM  ← PUT /firm/update-firm/:firmId
══════════════════════════════════════════ */
const updateFirm = async (req, res) => {
  try {
    console.log(`[updateFirm] id=${req.params.firmId} vendor=${req.vendorId}`);

    const firm = await Firm.findById(req.params.firmId);
    if (!firm) return res.status(404).json({ message: 'Firm not found' });

    if (firm.vendor.toString() !== req.vendorId.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const { firmName, area, offer, category, region } = req.body;

    if (firmName !== undefined) firm.firmName = firmName;
    if (area     !== undefined) firm.area     = area;
    if (offer    !== undefined) firm.offer    = offer;
    if (category !== undefined) firm.category = toArr(category);
    if (region   !== undefined) firm.region   = toArr(region);

    if (req.file) {
      await deleteOldImage(firm.image);
      firm.image = getImageUrl(req.file);
    }

    const updated = await firm.save();
    console.log(`[updateFirm] saved OK, image=${updated.image}`);

    return res.status(200).json({
      message:        'Firm updated successfully',
      firm:           updated,
      vendorFirmName: updated.firmName,
    });
  } catch (e) {
    console.error('updateFirm:', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/* ══════════════════════════════════════════
   GET FIRM BY ID
══════════════════════════════════════════ */
const getFirmById = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id)
      .populate('vendor', 'username email')
      .populate('products');
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.status(200).json(firm);
  } catch (e) {
    console.error('getFirmById:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ══════════════════════════════════════════
   DELETE FIRM
══════════════════════════════════════════ */
const deleteFirmById = async (req, res) => {
  try {
    const firm = await Firm.findByIdAndDelete(req.params.firmId);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });

    await deleteOldImage(firm.image);

    const vendor = await Vendor.findById(firm.vendor);
    if (vendor) {
      vendor.firm = vendor.firm.filter(f => f.toString() !== req.params.firmId);
      await vendor.save();
    }
    return res.status(200).json({ message: 'Firm deleted successfully' });
  } catch (e) {
    console.error('deleteFirmById:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ══════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════ */
module.exports = {
  addFirm:       [upload.single('image'), addFirm],
  updateFirm:    [upload.single('image'), updateFirm],
  getFirmById,
  deleteFirmById,
};
