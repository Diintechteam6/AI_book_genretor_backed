/**
 * analyzeStyleService.js
 * 
 * Analyzes an uploaded reference book (PDF/TXT) using Google Gemini AI
 * and extracts a structured "Style Config" that describes:
 *  - Chapter format, paragraph style, list style, heading hierarchy
 *  - Presence of summary boxes, quotes, key-point callouts
 *  - Writing tone (formal, casual, academic, storytelling)
 *  - Custom inline CSS to apply to the live preview
 * 
 * The 5 existing hardcoded templates are NOT touched.
 * This style config is only applied as a 6th "custom" overlay.
 */

const { parseFile } = require('./fileParserService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Gemini model priority list (same as other services)
const GEMINI_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.6-flash'
];

/**
 * Extract plain text from a file (PDF or TXT)
 */
const extractTextFromFile = async (filePath, mimetype) => {
    return await parseFile(filePath, mimetype);
};

/**
 * Call Gemini to analyze the style of the extracted book text
 * Returns a structured style config JSON
 */
const analyzeBookStyle = async (bookText) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('PASTE_YOUR')) {
        throw new Error('GEMINI_API_KEY not configured.');
    }

    // Take first 8000 chars for analysis (enough to detect patterns)
    const sample = bookText.substring(0, 8000).trim();

    const prompt = `You are an expert book design analyst and typography specialist.

Analyze the following book text sample carefully and extract its structural and stylistic patterns.

BOOK TEXT SAMPLE:
---
${sample}
---

Based ONLY on what you observe in the text above, return a valid JSON object describing the book's style:

{
  "chapterFormat": "Chapter X: Title | Chapter X | X. Title | CHAPTER X | etc",
  "hasSummaryBox": true or false (does each chapter end with a summary/key points section?),
  "hasQuotes": true or false (are there inspirational/chapter-opening quotes?),
  "hasNumberedKeyPoints": true or false (are there numbered key takeaways or action steps?),
  "hasBulletLists": true or false,
  "paragraphStyle": "indented | spaced | compact",
  "writingTone": "formal | casual | academic | storytelling | technical | self-help",
  "fontStyle": "serif | sans-serif | monospace",
  "colorScheme": "light | dark | warm | cool",
  "sectionHeadingStyle": "bold-numbered | bold-plain | italic | all-caps | none",
  "customCSS": "/* Valid CSS string - 200 chars max - for overriding paragraph/heading appearance based on the detected style. Must be a single line with no line breaks. Example: .section-body-content p { text-indent: 2em; margin-bottom: 0; } */"
}

RULES:
- Return ONLY the JSON object, no markdown, no explanation.
- customCSS must be a single-line string (no actual newlines in the string value).
- Keep customCSS under 400 characters.
- Be precise about chapterFormat - copy the exact format pattern you see in the text.`;

    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`📖 Analyzing book style with Gemini (${modelName})...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            });

            const result = await model.generateContent(prompt);
            let text = result.response.text().trim();

            // Strip markdown fences if any
            text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

            const parsed = JSON.parse(text);
            console.log(`✅ Style analysis complete using ${modelName}:`, parsed.writingTone, parsed.fontStyle);
            return parsed;
        } catch (err) {
            console.warn(`Gemini (${modelName}) style analysis note:`, err.message);
        }
    }

    // Fallback: return a neutral style config
    console.warn('⚠️ Gemini style analysis failed, returning neutral style config.');
    return {
        chapterFormat: 'Chapter X: Title',
        hasSummaryBox: false,
        hasQuotes: false,
        hasNumberedKeyPoints: false,
        hasBulletLists: true,
        paragraphStyle: 'spaced',
        writingTone: 'formal',
        fontStyle: 'serif',
        colorScheme: 'light',
        sectionHeadingStyle: 'bold-plain',
        customCSS: '.section-body-content p { font-family: Georgia, serif; line-height: 1.8; }'
    };
};

/**
 * Build a custom CSS string from the style config for live preview injection
 */
const buildCustomStyleCSS = (styleConfig) => {
    const {
        paragraphStyle,
        fontStyle,
        hasSummaryBox,
        writingTone,
        colorScheme,
        sectionHeadingStyle,
        customCSS
    } = styleConfig;

    const fontFamily = fontStyle === 'monospace'
        ? "'Courier New', Courier, monospace"
        : fontStyle === 'sans-serif'
            ? "'Inter', 'Helvetica Neue', Arial, sans-serif"
            : "Georgia, 'Times New Roman', serif";

    const pIndent = paragraphStyle === 'indented' ? 'text-indent: 2em; margin-bottom: 0.3em;' : 'margin-bottom: 1.1em;';
    const summaryBorder = hasSummaryBox ? 'border-left: 4px solid #6366f1; padding-left: 1em; margin: 1.5em 0; background: #f5f3ff; border-radius: 4px;' : '';
    const headingTransform = sectionHeadingStyle === 'all-caps' ? 'text-transform: uppercase; letter-spacing: 0.08em;' : '';

    return `
        /* ===== Style Cloned from Your Reference Book ===== */
        .template-custom-style .section-body-content p,
        .template-custom-style .section-content p {
            font-family: ${fontFamily};
            ${pIndent}
            line-height: 1.85;
        }
        .template-custom-style .chapter-summary-box,
        .template-custom-style .chapter-summary { ${summaryBorder} }
        .template-custom-style .section-heading-text,
        .template-custom-style .section-heading { ${headingTransform} font-family: ${fontFamily}; }
        .template-custom-style .cover-page { background: ${colorScheme === 'dark' ? '#0f172a' : colorScheme === 'warm' ? '#fdf6ec' : '#ffffff'}; }
        ${customCSS || ''}
    `.replace(/\s+/g, ' ').trim();
};

/**
 * Main exported function: analyze uploaded file and return style config + CSS
 */
const analyzeUploadedBookStyle = async (filePath, mimetype) => {
    try {
        // 1. Extract text from file
        const rawText = await extractTextFromFile(filePath, mimetype);
        if (!rawText || rawText.trim().length < 100) {
            throw new Error('Could not extract enough text from the uploaded file.');
        }

        // 2. Analyze style with Gemini
        const styleConfig = await analyzeBookStyle(rawText);

        // 3. Build live-preview CSS
        const previewCSS = buildCustomStyleCSS(styleConfig);

        return {
            success: true,
            styleConfig,
            previewCSS,
            textSampleLength: rawText.length
        };
    } finally {
        // Always clean up uploaded temp file
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}
    }
};

module.exports = { analyzeUploadedBookStyle };
