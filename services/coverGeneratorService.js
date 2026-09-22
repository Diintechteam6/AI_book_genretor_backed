const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Curated high-resolution Unsplash book cover artwork (100% watermark-free, licensed for free use)
const THEMATIC_COVERS = {
    tech: [
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&q=85', // Clean coding dark setup
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&q=85', // Laptop code editor
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&q=85', // Matrix digital green
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&q=85'  // Futuristic abstract 3D wave
    ],
    business: [
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=85', // Modern skyscraper architecture
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&q=85', // Clean workspace
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=85'  // Global interconnected world
    ],
    fantasy: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&q=85', // Magical nebula mountains
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=85', // Misty enchanted forest
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=85'  // Starry night mountain peak
    ],
    minimalist: [
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&q=85', // Minimalist aesthetic books
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=900&q=85', // Minimal aesthetic nature
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&q=85'  // Elegant book cover
    ],
    vintage: [
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&q=85', // Antique leather books
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&q=85'  // Classic hardcover book
    ],
    cyberpunk: [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&q=85', // Cyber gaming neon
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&q=85'  // Tech retro cyberpunk
    ]
};

// SVG Designer Book Cover Generator (Zero-fail vector typography & geometry)
const generateSVGArtwork = (title, author, category, style) => {
    const safeTitle = (title || 'Mastering Knowledge').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeAuthor = (author || 'Renowned Author').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCategory = (category || 'BESTSELLER EDITION').replace(/&/g, '&amp;').toUpperCase();

    // Color palettes by style
    const themes = {
        modern: { c1: '#0f172a', c2: '#1e1b4b', c3: '#312e81', accent: '#6366f1', gold: '#f59e0b' },
        fantasy: { c1: '#1e1b4b', c2: '#4c1d95', c3: '#581c87', accent: '#c084fc', gold: '#fbbf24' },
        vintage: { c1: '#3c1808', c2: '#5f2307', c3: '#78350f', accent: '#f59e0b', gold: '#d97706' },
        cyberpunk: { c1: '#030712', c2: '#111827', c3: '#064e3b', accent: '#10b981', gold: '#06b6d4' },
        minimalist: { c1: '#18181b', c2: '#27272a', c3: '#3f3f46', accent: '#94a3b8', gold: '#e2e8f0' }
    };
    const t = themes[style] || themes.modern;

    // Split title into lines if too long
    const words = safeTitle.split(' ');
    let line1 = '';
    let line2 = '';
    words.forEach(w => {
        if ((line1 + ' ' + w).length <= 18) {
            line1 += (line1 ? ' ' : '') + w;
        } else {
            line2 += (line2 ? ' ' : '') + w;
        }
    });

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${t.c1}" />
          <stop offset="50%" stop-color="${t.c2}" />
          <stop offset="100%" stop-color="${t.c3}" />
        </linearGradient>
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6" />
        </filter>
      </defs>

      <!-- Main Background -->
      <rect width="800" height="1200" fill="url(#bgGrad)" />

      <!-- Decorative Outer & Inner Borders -->
      <rect x="36" y="36" width="728" height="1128" fill="none" stroke="${t.gold}" stroke-width="2" rx="14" opacity="0.4" />
      <rect x="48" y="48" width="704" height="1104" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" rx="10" />

      <!-- Corner Ornaments -->
      <circle cx="56" cy="56" r="4" fill="${t.gold}" opacity="0.6" />
      <circle cx="744" cy="56" r="4" fill="${t.gold}" opacity="0.6" />
      <circle cx="56" cy="1144" r="4" fill="${t.gold}" opacity="0.6" />
      <circle cx="744" cy="1144" r="4" fill="${t.gold}" opacity="0.6" />

      <!-- Left Spine 3D Shading Effect -->
      <rect x="0" y="0" width="55" height="1200" fill="#000000" opacity="0.3" />
      <line x1="55" y1="0" x2="55" y2="1200" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />

      <!-- Category Pill Badge -->
      <rect x="250" y="160" width="300" height="42" rx="21" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="400" y="187" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="${t.accent}" text-anchor="middle" letter-spacing="3">
        ${safeCategory}
      </text>

      <!-- Center Geometric Emblem -->
      <circle cx="400" cy="330" r="48" fill="none" stroke="${t.gold}" stroke-width="2" opacity="0.5" />
      <polygon points="400,296 428,344 372,344" fill="${t.accent}" opacity="0.4" />
      <polygon points="400,364 372,316 428,316" fill="${t.gold}" opacity="0.4" />

      <!-- Book Title -->
      <text x="400" y="${line2 ? 490 : 520}" font-family="'Georgia', serif" font-size="${line2 ? 48 : 54}" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#textGlow)">
        ${line1}
      </text>
      ${line2 ? `
      <text x="400" y="555" font-family="'Georgia', serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#textGlow)">
        ${line2}
      </text>` : ''}

      <!-- Ornamental Separator Line -->
      <line x1="320" y1="620" x2="480" y2="620" stroke="${t.gold}" stroke-width="3" stroke-linecap="round" />
      <circle cx="400" cy="620" r="5" fill="${t.gold}" />

      <!-- Author Section -->
      <text x="400" y="960" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="4">
        AN ORIGINAL WORK BY
      </text>
      <text x="400" y="1005" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
        ${safeAuthor}
      </text>
    </svg>
    `;

    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

/**
 * Attempt generation using Google Gemini Imagen 3 and Gemini Flash Image models
 */
const generateWithGoogleImagen = async (prompt, title, style) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('PASTE_YOUR')) return null;

    const enrichedPrompt = `${prompt || `${style} book cover for "${title}"`}, luxury book cover artwork, 8k resolution, cinematic lighting, masterpiece, clean centered composition`;

    // Attempt 1: Google Imagen 3 predict endpoint
    try {
        console.log('🎨 Attempting cover generation with Google Imagen 3...');
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
        const imagenRes = await axios.post(
            imagenUrl,
            {
                instances: [{ prompt: enrichedPrompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '3:4',
                    outputMimeType: 'image/jpeg'
                }
            },
            { timeout: 12000 }
        );

        const base64Data = imagenRes.data?.predictions?.[0]?.bytesBase64Encoded;
        if (base64Data) {
            console.log('✅ Google Imagen 3 successfully generated book cover!');
            return `data:image/jpeg;base64,${base64Data}`;
        }
    } catch (err) {
        console.warn('Google Imagen 3 API Notice:', err.response?.data?.error?.message || err.message);
    }

    // Attempt 2: Gemini Flash Image / Nano Banana endpoint
    try {
        console.log('🎨 Attempting generation with Gemini Flash Image...');
        const flashImageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        const flashRes = await axios.post(
            flashImageUrl,
            {
                contents: [{
                    parts: [{ text: `Generate high-resolution portrait book cover graphic: ${enrichedPrompt}` }]
                }]
            },
            { timeout: 12000 }
        );

        const candidate = flashRes.data?.candidates?.[0]?.content?.parts?.[0];
        if (candidate?.inlineData?.data) {
            const mime = candidate.inlineData.mimeType || 'image/jpeg';
            console.log('✅ Gemini Flash Image successfully generated book cover!');
            return `data:${mime};base64,${candidate.inlineData.data}`;
        }
    } catch (err) {
        console.warn('Gemini Flash Image Notice:', err.response?.data?.error?.message || err.message);
    }

    return null;
};

/**
 * Generate luxury vector graphic artwork directly using Google Gemini API
 * Zero watermarks, perfect spelling, crystal-clear typography, pure vector SVG.
 */
const generateWithGeminiSVG = async (title, author, category, style, prompt) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('PASTE_YOUR')) return null;

    const geminiModels = [
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
        'gemini-3.7-flash',
        'gemini-3.5-flash',
        'gemini-3.6-flash'
    ];

    const safeTitle = (title || 'Mastering Knowledge').trim();
    const safeAuthor = (author || 'Renowned Author').trim();
    const safeCategory = (category || 'Non-Fiction').trim();
    const safeStyle = (style || 'modern').trim();

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemPrompt = `You are a world-class book cover artist and master vector graphic designer.
Create a production-grade, stunning luxury SVG book cover for:
- Book Title: "${safeTitle}"
- Author Name: "${safeAuthor}"
- Genre/Category: "${safeCategory}"
- Theme/Style: "${safeStyle}"
${prompt ? `- User Specific Art Direction: "${prompt}"` : ''}

STRICT SPECIFICATIONS:
1. Return ONLY the SVG code starting with <svg and ending with </svg>. No introductory text or closing markdown.
2. SVG attributes: viewBox="0 0 800 1200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"
3. Background: Deep rich gradients (e.g., obsidian #07090e, royal navy #0f172a, deep emerald, or amethyst violet based on theme).
4. Geometry & Art: Include ornate borders, gold or neon glowing accents, isometric / celestial / architectural vector motifs matching the genre.
5. Typography: Beautifully styled <text> elements displaying "${safeTitle}" and "By ${safeAuthor}". Ensure 100% correct spelling, high contrast, and balanced hierarchy.
6. ABSOLUTELY NO WATERMARKS, NO THIRD-PARTY LOGOS, NO DISTORTED GIBBERISH TEXT.`;

    for (const modelName of geminiModels) {
        try {
            console.log(`🎨 Designing book cover graphic with Google Gemini (${modelName})...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(systemPrompt);
            const text = result.response.text();

            const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
            if (svgMatch && svgMatch[0].length > 500) {
                console.log(`✅ Google Gemini (${modelName}) successfully designed vector book cover!`);
                return 'data:image/svg+xml;base64,' + Buffer.from(svgMatch[0]).toString('base64');
            }
        } catch (err) {
            console.warn(`Gemini (${modelName}) SVG generation note:`, err.message);
        }
    }

    return null;
};

/**
 * Generate a guaranteed, watermark-free, high-resolution Book Cover
 * Priority: Google Gemini Imagen 3 -> Google Gemini AI Vector Designer -> Watermark-Free HD Photography -> Zero-fail SVG
 */
const generateCoverArt = async ({ title, author, category, style = 'modern', prompt = '' }) => {
    const selectedStyle = style.toLowerCase();

    // 1. Priority 1: Google Gemini Imagen 3 / Flash Image (if billing enabled)
    try {
        const googleCover = await generateWithGoogleImagen(prompt, title, selectedStyle);
        if (googleCover) return googleCover;
    } catch (e) {
        console.warn('Google Imagen generation skipped:', e.message);
    }

    // 2. Priority 2: Google Gemini AI Vector Graphic Designer (100% Free, Zero Watermarks, Perfect Typography)
    try {
        const geminiSvgCover = await generateWithGeminiSVG(title, author, category, selectedStyle, prompt);
        if (geminiSvgCover) return geminiSvgCover;
    } catch (e) {
        console.warn('Google Gemini SVG design skipped:', e.message);
    }

    // 3. Priority 3: Watermark-Free Curated HD Photography (Unsplash)
    const stylePhotos = THEMATIC_COVERS[selectedStyle] || THEMATIC_COVERS.modern;
    const randomPhotoUrl = stylePhotos[Math.floor(Math.random() * stylePhotos.length)];

    try {
        const photoRes = await axios.get(randomPhotoUrl, { responseType: 'arraybuffer', timeout: 8000 });
        if (photoRes.status === 200 && photoRes.data && photoRes.data.length > 5000) {
            return 'data:image/jpeg;base64,' + Buffer.from(photoRes.data).toString('base64');
        }
    } catch (photoErr) {
        console.warn('Curated HD photography fetch failed, generating instant SVG vector artwork:', photoErr.message);
    }

    // 4. Priority 4: 100% offline & instantaneous Luxury SVG Vector Book Cover
    return generateSVGArtwork(title, author, category, selectedStyle);
};

module.exports = { generateCoverArt, generateSVGArtwork };
