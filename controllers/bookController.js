const Book = require('../models/Book');
const { parseFile } = require('../services/fileParserService');
const { processBookContent, aiAssistService } = require('../services/geminiService');
const { generatePDF } = require('../services/pdfService');
const { generateHTML } = require('../services/templateService');
const { generateCoverArt } = require('../services/coverGeneratorService');
const { analyzeUploadedBookStyle } = require('../services/analyzeStyleService');
const fs = require('fs');

// Step 1: Create book with details + content
const createBook = async (req, res) => {
    try {
        const { title, author, language, category, description, templateId, rawContent, coverImage } = req.body;

        let finalContent = rawContent || '';

        // If a file was uploaded, parse it
        if (req.file) {
            try {
                finalContent = await parseFile(req.file.path, req.file.mimetype);
            } finally {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            }
        }

        if (!finalContent || finalContent.trim().length < 50) {
            return res.status(400).json({ success: false, message: 'Please provide book content (at least 50 characters)' });
        }

        const book = await Book.create({
            title, author, language, category, description,
            templateId: templateId || 'modern',
            originalContent: finalContent,
            coverImage: coverImage || null,
            status: 'draft'
        });

        res.status(201).json({ success: true, data: book });
    } catch (error) {
        console.error('createBook error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 2: Process with AI (Gemini)
const processWithAI = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

        await Book.findByIdAndUpdate(req.params.id, { status: 'processing' });

        const structuredContent = await processBookContent(book.originalContent, {
            title: book.title,
            author: book.author,
            language: book.language,
            category: book.category
        });

        if (book.coverImage) {
            structuredContent.coverImage = book.coverImage;
        }

        await Book.findByIdAndUpdate(req.params.id, { structuredContent, status: 'completed' });

        res.status(200).json({ success: true, data: structuredContent });
    } catch (error) {
        await Book.findByIdAndUpdate(req.params.id, { status: 'failed' });
        console.error('processWithAI error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 3: Generate PDF
const generateBookPDF = async (req, res) => {
    try {
        const book = req.params.id ? await Book.findById(req.params.id) : null;
        const html = req.body.html;
        const structuredContent = req.body.structuredContent || book?.structuredContent;
        const templateId = req.body.templateId || book?.templateId || 'modern';
        const pageDimensions = req.body.pageDimensions;
        const customCSS = req.body.customCSS || null;  // For 'custom-style' template

        const bookMeta = {
            title: structuredContent?.title || book?.title || 'Book',
            author: structuredContent?.author || book?.author || 'Author',
            category: structuredContent?.category || book?.category || ''
        };

        let result;
        if (html) {
            result = await generatePDF(html, templateId, pageDimensions, bookMeta);
        } else if (structuredContent) {
            // Pass customCSS to generateHTML for custom-style template
            const htmlContent = generateHTML(structuredContent, templateId, customCSS);
            result = await generatePDF(htmlContent, templateId, pageDimensions, bookMeta);
        } else {
            return res.status(400).json({ success: false, message: 'Please provide content or HTML to generate PDF' });
        }

        const title = (structuredContent?.title || book?.title || 'Book').replace(/[^a-zA-Z0-9_\-]/g, '_');

        if (book) {
            await Book.findByIdAndUpdate(req.params.id, { 
                pdfUrl: `/generated/${result.fileName}`,
                ...(structuredContent ? { structuredContent } : {}),
                ...(templateId ? { templateId } : {})
            });
        }

        res.download(result.outputPath, `${title}.pdf`, (err) => {
            if (err) console.error('PDF download error:', err);
        });
    } catch (error) {
        console.error('generateBookPDF error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Preview Book HTML
const previewBookHTML = async (req, res) => {
    try {
        const { structuredContent, templateId, customCSS } = req.body;
        let bookData = structuredContent;
        let selectedTemplate = templateId || 'modern';

        if (!bookData && req.params.id) {
            const book = await Book.findById(req.params.id);
            if (book) {
                bookData = book.structuredContent;
                if (!templateId) selectedTemplate = book.templateId || 'modern';
            }
        }

        if (!bookData) {
            return res.status(400).send('<h3>No book content found to preview</h3>');
        }

        const html = generateHTML(bookData, selectedTemplate, customCSS || null);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        res.status(500).send(`<h3>Error generating preview: ${error.message}</h3>`);
    }
};

// Update Book (manual edits)
const updateBook = async (req, res) => {
    try {
        const { structuredContent, templateId, title, author, coverImage } = req.body;
        const updateData = {};
        if (structuredContent) updateData.structuredContent = structuredContent;
        if (templateId) updateData.templateId = templateId;
        if (title) updateData.title = title;
        if (author) updateData.author = author;
        if (coverImage !== undefined) {
            updateData.coverImage = coverImage;
            if (updateData.structuredContent) {
                updateData.structuredContent.coverImage = coverImage;
            }
        }

        const book = await Book.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

        res.status(200).json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all books
const getBooks = async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 }).select('-originalContent -structuredContent');
        res.status(200).json({ success: true, data: books });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single book
const getBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        res.status(200).json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// In-editor AI writing assist
const aiAssist = async (req, res) => {
    try {
        const { action, content, context } = req.body;
        if (!action) {
            return res.status(400).json({ success: false, message: 'Action is required' });
        }
        const result = await aiAssistService(action, content, context);
        res.status(200).json(result);
    } catch (error) {
        console.error('aiAssist error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a book
const deleteBook = async (req, res) => {
    try {
        const book = await Book.findByIdAndDelete(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        res.status(200).json({ success: true, message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate guaranteed high-res book cover art
const generateBookCover = async (req, res) => {
    try {
        const { title, author, category, style, prompt } = req.body;
        const coverData = await generateCoverArt({ title, author, category, style, prompt });
        res.status(200).json({ success: true, coverImage: coverData });
    } catch (error) {
        console.error('generateBookCover error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Analyze uploaded reference book and extract its style config
const analyzeStyle = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a reference book file (PDF or TXT).' });
        }
        const result = await analyzeUploadedBookStyle(req.file.path, req.file.mimetype);
        res.status(200).json(result);
    } catch (error) {
        console.error('analyzeStyle error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createBook, processWithAI, generateBookPDF, previewBookHTML, updateBook, getBooks, getBook, aiAssist, deleteBook, generateBookCover, analyzeStyle };


