require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Connect to Database (Gemini AI Book Engine)
connectDB();

const app = express();

// Create necessary directories
['uploads', 'generated'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve generated PDFs as static files
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Routes
const bookRoutes = require('./routes/bookRoutes');
app.use('/api/books', bookRoutes);

// Templates list API
app.get('/api/templates', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'modern',    name: 'Modern',     description: 'Clean dark blue design with red accents', icon: '🔵' },
            { id: 'classic',   name: 'Classic',    description: 'Traditional book style with serif fonts', icon: '📜' },
            { id: 'education', name: 'Education',  description: 'Colorful and student-friendly layout',   icon: '🎓' },
            { id: 'minimal',   name: 'Minimal',    description: 'Clean, simple and distraction-free',     icon: '⬜' },
            { id: 'technical', name: 'Technical',  description: 'Dark code-editor style for tech books',  icon: '💻' },
        ]
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ message: '📚 AI Book Generator API is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
