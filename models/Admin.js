const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Plain text as requested
    role: { type: String, enum: ['admin', 'client'], default: 'client' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', AdminSchema);
