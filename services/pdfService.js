const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { generateHTML } = require('./templateService');

const escapeXml = (unsafe) => {
    return String(unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const generatePDF = async (bookDataOrHtml, templateId, pageDimensions, bookMeta) => {
    let html = '';
    let bookTitle = 'Book';
    let bookAuthor = 'Author';
    let bookCategory = '';

    if (bookMeta) {
        bookTitle = bookMeta.title || bookTitle;
        bookAuthor = bookMeta.author || bookAuthor;
        bookCategory = bookMeta.category || bookCategory;
    }

    if (typeof bookDataOrHtml === 'string' && bookDataOrHtml.includes('<html')) {
        html = bookDataOrHtml;
        if (!bookMeta) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) bookTitle = titleMatch[1];
        }
    } else {
        html = generateHTML(bookDataOrHtml, templateId || 'modern');
        if (bookDataOrHtml) {
            bookTitle = bookDataOrHtml.title || bookTitle;
            bookAuthor = bookDataOrHtml.author || bookAuthor;
            bookCategory = bookDataOrHtml.category || bookCategory;
        }
    }

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `book_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, fileName);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ]
    });

    try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);

        try {
            await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
        } catch (navErr) {
            console.warn('Initial load timed out, falling back to domcontentloaded:', navErr.message);
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }

        // Dimension and margins calculation
        const basePdfOptions = {
            printBackground: true
        };

        let marginMm = { top: 22, bottom: 22, left: 20, right: 20 };
        if (pageDimensions && pageDimensions.width && pageDimensions.height) {
            basePdfOptions.width = `${pageDimensions.width}mm`;
            basePdfOptions.height = `${pageDimensions.height}mm`;
            if (pageDimensions.width < 160) {
                marginMm = { top: 18, bottom: 18, left: 14, right: 14 };
            }
        } else {
            basePdfOptions.format = 'A4';
        }

        // Theme styling based on template
        let headerFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        let headerColor = '#64748b';
        let borderColor = '#e2e8f0';

        if (templateId === 'classic') {
            headerFont = "Georgia, 'Times New Roman', serif";
            headerColor = '#78350f';
            borderColor = '#fde68a';
        } else if (templateId === 'technical') {
            headerFont = "'Courier New', Consolas, monospace";
            headerColor = '#94a3b8';
            borderColor = '#334155';
        } else if (templateId === 'education') {
            headerFont = "Arial, -apple-system, sans-serif";
            headerColor = '#4f46e5';
            borderColor = '#c7d2fe';
        }

        const safeTitle = escapeXml(bookTitle);
        const safeAuthor = escapeXml(bookAuthor);
        const rightHeaderTag = escapeXml(bookCategory ? bookCategory.toUpperCase() : 'AI BOOK PUBLISHER');

        // 1. Generate full PDF with Header & Footer
        const fullPdfBytes = await page.pdf({
            ...basePdfOptions,
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-family: ${headerFont}; font-size: 8pt; color: ${headerColor}; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 ${marginMm.left}mm; margin: 0; border-bottom: 1px solid ${borderColor}; padding-bottom: 5px; box-sizing: border-box;">
                    <span style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeTitle}</span>
                    <span style="font-style: italic; color: #94a3b8; font-size: 7.5pt;">${rightHeaderTag}</span>
                </div>
            `,
            footerTemplate: `
                <div style="font-family: ${headerFont}; font-size: 8pt; color: ${headerColor}; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 ${marginMm.left}mm; margin: 0; border-top: 1px solid ${borderColor}; padding-top: 5px; box-sizing: border-box;">
                    <span>By ${safeAuthor}</span>
                    <span style="font-family: monospace; font-weight: 600; color: #475569;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                </div>
            `,
            margin: {
                top: `${marginMm.top}mm`,
                bottom: `${marginMm.bottom}mm`,
                left: `${marginMm.left}mm`,
                right: `${marginMm.right}mm`
            }
        });

        try {
            // 2. Load PDF into pdf-lib to ensure Cover Page (Page 1) is clean without headers/footers
            const fullDoc = await PDFDocument.load(fullPdfBytes);
            const totalPages = fullDoc.getPageCount();

            if (totalPages > 1) {
                // Generate page 1 (cover) cleanly with 0 margin and no header/footer
                const coverPdfBytes = await page.pdf({
                    ...basePdfOptions,
                    pageRanges: '1',
                    displayHeaderFooter: false,
                    margin: { top: 0, bottom: 0, left: 0, right: 0 }
                });
                const coverDoc = await PDFDocument.load(coverPdfBytes);
                const [cleanCoverPage] = await fullDoc.copyPages(coverDoc, [0]);
                fullDoc.removePage(0);
                fullDoc.insertPage(0, cleanCoverPage);
            }

            const finalBytes = await fullDoc.save();
            fs.writeFileSync(outputPath, finalBytes);
        } catch (mergeErr) {
            console.error('PDF post-processing warning:', mergeErr);
            fs.writeFileSync(outputPath, fullPdfBytes);
        }

        return { fileName, outputPath };
    } finally {
        if (browser) {
            await browser.close().catch(err => console.error('Error closing browser:', err.message));
        }
    }
};

module.exports = { generatePDF };

