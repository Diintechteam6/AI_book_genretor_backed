const mongoose = require('mongoose');

const BookRecordSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true
    },
    bookType: {
        type: String,
        required: true, // e.g., 'Fiction', 'Non-Fiction'
    },
    targetAudience: {
        type: String,
        default: 'General'
    },
    generatedContent: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'completed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BookRecord', BookRecordSchema);
