const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    language: { type: String, default: 'English' },
    category: { type: String, default: 'General' },
    description: { type: String },
    originalContent: { type: String },       // Raw content from user
    structuredContent: { type: Object },      // AI processed JSON
    templateId: { type: String, default: 'modern' },
    coverImage: { type: String },
    pdfUrl: { type: String },
    status: {
        type: String,
        enum: ['draft', 'processing', 'completed', 'failed'],
        default: 'draft'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', BookSchema);
