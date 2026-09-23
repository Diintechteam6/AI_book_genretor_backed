const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Multer config for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
const {
    registerAdmin,
    loginAdmin,
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    toggleUserStatus,
    impersonateUser
} = require('../controllers/adminController');
const { protect, adminProtect } = require('../middleware/auth');

// Public routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Personal profile routes (accessible to any logged-in user: admin or client)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile/upload', protect, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const photoUrl = '/uploads/' + req.file.filename;
        const Admin = require('../models/Admin');
        const admin = await Admin.findById(req.admin._id);
        if (admin) {
            admin.profilePhoto = photoUrl;
            await admin.save();
            res.json({ success: true, photoUrl });
        } else {
            res.status(404).json({ success: false, message: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.put('/change-password', protect, changePassword);

// User management routes (accessible ONLY to admin role)
router.get('/users', protect, adminProtect, getAllUsers);
router.get('/users/:id', protect, adminProtect, getUserById);
router.put('/users/:id', protect, adminProtect, updateUser);
router.delete('/users/:id', protect, adminProtect, deleteUser);
router.patch('/users/:id/status', protect, adminProtect, toggleUserStatus);
router.get('/users/:id/impersonate', protect, adminProtect, impersonateUser);

module.exports = router;
