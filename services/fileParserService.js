const mammoth = require('mammoth');
const pdfModule = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Parse uploaded file and extract text content
 * Supports: .txt, .docx, .pdf
 */
const parseFile = async (filePath, mimetype) => {
    try {
        const ext = path.extname(filePath).toLowerCase();

        if (mimetype === 'text/plain' || ext === '.txt') {
            return fs.readFileSync(filePath, 'utf8');
        }

        if (
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword' ||
            ext === '.docx' ||
            ext === '.doc'
        ) {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        }

        if (mimetype === 'application/pdf' || ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            
            // Support both pdf-parse v2 (class) and v1 (function)
            if (typeof pdfModule === 'function') {
                const data = await pdfModule(dataBuffer);
                return data.text;
            } else if (pdfModule.PDFParse) {
                const parser = new pdfModule.PDFParse({ data: dataBuffer });
                const result = await parser.getText();
                await parser.destroy();
                return result.text;
            } else {
                throw new Error('Incompatible pdf-parse library structure');
            }
        }

        throw new Error(`Unsupported file type: ${mimetype || ext}`);
    } catch (error) {
        throw new Error(`File parsing failed: ${error.message}`);
    }
};

module.exports = { parseFile };
