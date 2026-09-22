const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createBook, processWithAI, generateBookPDF, previewBookHTML, updateBook, getBooks, getBook, aiAssist, deleteBook, generateBookCover, analyzeStyle } = require('../controllers/bookController');

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { 
        fileSize: 50 * 1024 * 1024,  // 50MB max file size
        fieldSize: 50 * 1024 * 1024 // 50MB max field size for base64 cover images and book text
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['.txt', '.docx', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only .txt, .docx, .pdf files are allowed'));
    }
});

router.post('/', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'File too large! Maximum allowed size is 50MB.' });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, createBook);         // Create book
router.post('/generate-cover', generateBookCover);            // High-res book cover art generator
router.post('/ai-assist', aiAssist);                          // In-editor AI assistant
router.post('/analyze-style', (req, res, next) => {          // Style analyzer for reference book upload
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, analyzeStyle);
router.post('/:id/process', processWithAI);                  // AI Process
router.post('/preview', previewBookHTML);                      // Preview arbitrary structuredContent
router.post('/:id/preview', previewBookHTML);                  // Preview book HTML
router.put('/:id', updateBook);                                // Manual update book content
router.delete('/:id', deleteBook);                             // Delete book
router.post('/generate-pdf', generateBookPDF);                // Generate PDF from HTML or content directly
router.post('/:id/generate-pdf', generateBookPDF);           // Generate PDF
router.get('/', getBooks);                                    // All books
router.get('/:id', getBook);                                  // Single book

module.exports = router;
