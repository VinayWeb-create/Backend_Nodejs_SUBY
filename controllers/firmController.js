const Firm = require('../models/Firm');
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Helper to safely parse JSON or return string
const safeParse = (input) => {
    try {
        const parsed = JSON.parse(input);
        return parsed;
    } catch {
        return input;
    }
};

// Add Firm Controller
const addFirm = async (req, res) => {
    try {
        let { firmName, area, category, region, offer } = req.body;

        // Safe parse if sent as JSON strings
        category = safeParse(category);
        region = safeParse(region);

        const image = req.file ? req.file.filename : undefined;

        const vendor = await Vendor.findById(req.vendorId);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        if (vendor.firm.length > 0) {
            return res.status(400).json({ message: "Vendor can have only one firm" });
        }

        const firm = new Firm({
            firmName,
            area,
            category,
            region,
            offer,
            image,
            vendor: vendor._id
        });

        const savedFirm = await firm.save();

        vendor.firm.push(savedFirm._id);
        await vendor.save();

        return res.status(200).json({
            message: 'Firm added successfully',
            firmId: savedFirm._id,
            vendorFirmName: savedFirm.firmName
        });

    } catch (error) {
        console.error("Add Firm Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Delete Firm Controller
const deleteFirmById = async (req, res) => {
    try {
        const firmId = req.params.firmId;

        const deletedFirm = await Firm.findByIdAndDelete(firmId);
        if (!deletedFirm) {
            return res.status(404).json({ error: "Firm not found" });
        }

        // Remove from vendor
        const vendor = await Vendor.findById(deletedFirm.vendor);
        if (vendor) {
            vendor.firm = vendor.firm.filter(f => f.toString() !== firmId);
            await vendor.save();
        }

        return res.status(200).json({ message: "Firm deleted successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
// Get Firm By ID Controller
const getFirmById = async (req, res) => {
    try {
        const firm = await Firm.findById(req.params.id);
        if (!firm) {
            return res.status(404).json({ error: "Firm not found" });
        }
        res.status(200).json(firm);
    } catch (error) {
        console.error("Get Firm Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


module.exports = {
    addFirm: [upload.single('image'), addFirm],
    deleteFirmById,
    getFirmById
};
