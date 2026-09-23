const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

// @desc    Register a new admin
// @route   POST /api/admin/register
// @access  Public
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please add all required fields' });
        }

        // Check if admin exists
        const adminExists = await Admin.findOne({ email });

        if (adminExists) {
            return res.status(400).json({ success: false, message: 'Admin already exists' });
        }

        // Create admin (Plain text password as requested)
        const admin = await Admin.create({
            name,
            email,
            password,
            role: role || 'client' // Default to client if not provided
        });

        if (admin) {
            res.status(201).json({
                success: true,
                _id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                token: generateToken(admin._id),
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid admin data' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate an admin
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for admin email
        const admin = await Admin.findOne({ email });

        // Check password (Plain text comparison as requested)
        if (admin && admin.password === password) {
            res.json({
                success: true,
                _id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                token: generateToken(admin._id),
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        res.status(200).json({ success: true, data: req.admin });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id);

        if (admin) {
            admin.name = req.body.name || admin.name;
            admin.email = req.body.email || admin.email;
            if (req.body.phone !== undefined) admin.phone = req.body.phone;
            if (req.body.location !== undefined) admin.location = req.body.location;

            const updatedAdmin = await admin.save();

            res.json({
                success: true,
                _id: updatedAdmin._id,
                name: updatedAdmin.name,
                email: updatedAdmin.email,
                phone: updatedAdmin.phone,
                location: updatedAdmin.location,
                profilePhoto: updatedAdmin.profilePhoto,
                token: generateToken(updatedAdmin._id),
            });
        } else {
            res.status(404).json({ success: false, message: 'Admin not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Change admin password
// @route   PUT /api/admin/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const admin = await Admin.findById(req.admin._id);

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        // Check old password (Plain text comparison)
        if (admin.password !== oldPassword) {
            return res.status(401).json({ success: false, message: 'Incorrect old password' });
        }

        // Update to new password (Plain text)
        admin.password = newPassword;
        await admin.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// USER MANAGEMENT APIs (Admin Only)
// ==========================================

// @desc    Get all users (admins and clients)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await Admin.find({});
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await Admin.findById(req.params.id);
        if (user) {
            res.json({ success: true, data: user });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update any user's profile
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const user = await Admin.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.role = req.body.role || user.role;
            if (req.body.password) {
                user.password = req.body.password; // Plain text
            }

            const updatedUser = await user.save();
            res.json({
                success: true,
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await Admin.findByIdAndDelete(req.params.id);
        if (user) {
            res.json({ success: true, message: 'User removed successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle user active/inactive status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
    try {
        const user = await Admin.findById(req.params.id);

        if (user) {
            user.status = user.status === 'active' ? 'inactive' : 'active';
            const updatedUser = await user.save();
            res.json({
                success: true,
                message: `User status changed to ${updatedUser.status}`,
                data: {
                    _id: updatedUser._id,
                    name: updatedUser.name,
                    status: updatedUser.status
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Impersonate a user (Generate token for a specific user)
// @route   GET /api/admin/users/:id/impersonate
// @access  Private/Admin
const impersonateUser = async (req, res) => {
    try {
        const user = await Admin.findById(req.params.id);
        if (user) {
            res.json({
                success: true,
                message: `Impersonating ${user.name}`,
                token: generateToken(user._id),
                role: user.role
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
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
};
