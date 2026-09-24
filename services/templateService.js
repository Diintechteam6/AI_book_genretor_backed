/**
 * Returns HTML string for a given template and structured book JSON
 */
const escapeHtml = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const generateHTML = (bookData, templateId, customCSS) => {
    switch (templateId) {
        case 'modern':       return modernTemplate(bookData);
        case 'classic':      return classicTemplate(bookData);
        case 'education':    return educationTemplate(bookData);
        case 'minimal':      return minimalTemplate(bookData);
        case 'technical':    return technicalTemplate(bookData);
        case 'custom-style': return modernTemplate(bookData, customCSS); // Reference-book style overlay on modern base
        default:             return modernTemplate(bookData);
    }
};

const renderSectionContent = (content) => {
    if (!content) return '';
    const trimmed = String(content).trim();
    if (trimmed.startsWith('<') || /<[a-z][\s\S]*>/i.test(trimmed)) {
        return `<div class="section-content rich-html">${trimmed}</div>`;
    }
    return `<p class="section-content">${trimmed.replace(/\n/g, '</p><p class="section-content">')}</p>`;
};

const renderChapters = (chapters, docSpacing) => chapters.map(ch => `
    <div class="chapter">
        <h2 class="chapter-title">Chapter ${ch.chapterNumber}: ${ch.title}</h2>
        ${ch.summary ? `<p class="chapter-summary"><em>${ch.summary}</em></p>` : ''}
        ${(ch.sections || []).map(sec => {
            const hasCustom = sec.spacing !== undefined && sec.spacing !== null && !isNaN(Number(sec.spacing));
            const defaultGap = docSpacing === 'compact' ? 8 : (docSpacing === 'relaxed' ? 28 : 18);
            const gap = hasCustom ? Math.max(0, Math.min(80, Number(sec.spacing))) : defaultGap;
            return `
            <div class="section" style="margin-bottom: ${gap}px !important;">
                ${sec.heading ? `<h3 class="section-heading"${gap <= 6 ? ' style="margin-top: 6px !important;"' : ''}>${sec.heading}</h3>` : ''}
                ${renderSectionContent(sec.content)}
            </div>
        `;}).join('')}
    </div>
`).join('');

const renderTOC = (toc) => `
    <div class="toc">
        <h2 class="toc-title">Table of Contents</h2>
        <ul class="toc-list">
            ${toc.map(item => `<li>Chapter ${item.chapter}: ${item.title}</li>`).join('')}
        </ul>
    </div>
`;

const renderCover = (book, defaultCoverHTML) => {
    if (book.coverImage) {
        return `
        <div class="cover-image-page" style="width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always; padding: 0; margin: 0; background: #fff;">
            <img src="${book.coverImage}" style="width: 100%; height: 100vh; object-fit: cover; display: block;" alt="Book Cover" />
        </div>`;
    }
    return defaultCoverHTML;
};

const renderTitleAndCopyrightPage = (book) => `
    <div class="title-copyright-page" style="page-break-after: always; break-after: page; display: flex; flex-direction: column; min-height: 240mm; box-sizing: border-box; padding-top: 15%;">
        
        <!-- TITLE SECTION -->
        <div style="text-align: center;">
            <h1 style="font-size: 3em; margin-bottom: 10px; font-weight: bold;">${escapeHtml(book.title)}</h1>
            ${book.subtitle ? `<h2 style="font-size: 1.5em; font-weight: 300; margin-bottom: 30px; opacity: 0.8;">${escapeHtml(book.subtitle)}</h2>` : ''}
            <h3 style="font-size: 1.2em; font-weight: bold; margin-top: 20px;">${escapeHtml(book.author)}</h3>
        </div>

        <div style="flex-grow: 1;"></div>

        <!-- COPYRIGHT SECTION -->
        <div style="font-size: 0.8em; line-height: 1.5; padding-top: 40px; margin-top: auto;">
            <p><strong>Copyright &copy; ${escapeHtml(book.publishedYear || new Date().getFullYear().toString())} by ${escapeHtml(book.author)}</strong></p>
            <p style="margin: 10px 0 15px 0; max-width: 600px; text-align: justify; opacity: 0.85;">${escapeHtml(book.copyrightText || 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.')}</p>
            <div style="border-top: 1px solid rgba(128,128,128,0.3); padding-top: 15px; margin-bottom: 15px; max-width: 600px;">
                <p style="margin-bottom: 5px;"><strong>Publisher:</strong> ${escapeHtml(book.publisher || 'Independent Publisher')}</p>
                <p style="margin-bottom: 5px;"><strong>Edition:</strong> ${escapeHtml(book.edition || 'First Edition')}</p>
                <p style="margin-bottom: 5px;"><strong>ISBN:</strong> ${escapeHtml(book.isbn || '978-X-XX-XXXXXX-X')}</p>
            </div>
            <p style="opacity: 0.7;">Printed in the United States of America.</p>
        </div>
    </div>
`;

const richContentCSS = `
  .section { margin-bottom: 18px; }
  .section-heading { break-after: avoid; page-break-after: avoid; }
  .section-content { margin-bottom: 0 !important; }
  .section-content p { margin: 0 0 10px 0; }
  .section-content p:last-child { margin-bottom: 0 !important; }
  .section-content > *:last-child { margin-bottom: 0 !important; }
  .section-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; break-inside: avoid; page-break-inside: avoid; }
  .section-content table, .section-content th, .section-content td { border: 1px solid #cbd5e1; padding: 8px 12px; }
  .section-content th { background: rgba(0,0,0,0.06); font-weight: 600; text-align: left; }
  .section-content ul { list-style-type: disc !important; margin: 8px 0 12px 28px; padding-left: 6px; }
  .section-content ol { list-style-type: decimal !important; margin: 8px 0 12px 28px; padding-left: 6px; }
  .section-content li { display: list-item !important; margin-bottom: 4px; }
  .section-content blockquote { border-left: 4px solid #6366f1; padding: 8px 14px; margin: 12px 0; background: rgba(99,102,241,0.05); font-style: italic; border-radius: 4px; break-inside: avoid; page-break-inside: avoid; }
  .section-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
  .section-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  .section-content code { background: rgba(0,0,0,0.06); padding: 2px 6px; font-family: monospace; font-size: 0.9em; border-radius: 3px; }
  .section-content .mce-pagebreak, .section-content .pagebreak { page-break-after: always; break-after: page; }
`;

// ========== MODERN TEMPLATE ==========
const modernTemplate = (book, customCSS) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(book.title || 'Book')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
  @page {
    size: A4;
    margin-top: 22mm;
    margin-bottom: 22mm;
    margin-left: 20mm;
    margin-right: 20mm;
  }
  @page :first {
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1a2e; background: white; }
  .cover { width: 100%; min-height: 100vh; height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 60px; text-align: center; page-break-after: always; break-after: page; }
  .cover h1 { font-size: 52px; font-weight: 700; margin-bottom: 20px; letter-spacing: -1px; }
  .cover .author { font-size: 22px; font-weight: 300; opacity: 0.8; margin-top: 10px; }
  .cover .category { font-size: 14px; text-transform: uppercase; letter-spacing: 4px; opacity: 0.6; margin-bottom: 30px; }
  .cover .divider { width: 60px; height: 3px; background: #e94560; margin: 30px auto; }
  .toc { padding: 10px 0 20px 0; page-break-after: always; break-after: page; }
  .toc-title { font-size: 32px; color: #0f3460; border-bottom: 3px solid #e94560; padding-bottom: 15px; margin-bottom: 30px; }
  .toc-list { list-style: none; }
  .toc-list li { padding: 10px 0; font-size: 15px; border-bottom: 1px solid #f0f0f0; color: #444; break-inside: avoid; page-break-inside: avoid; }
  .chapter { padding: 10px 0 20px 0; page-break-before: always; break-before: page; }
  .chapter-title { font-size: 36px; color: #0f3460; margin-bottom: 15px; border-left: 5px solid #e94560; padding-left: 20px; break-after: avoid; page-break-after: avoid; }
  .chapter-summary { color: #888; font-size: 15px; margin-bottom: 30px; padding: 15px; background: #f8f9ff; border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .section { margin-bottom: 18px; }
  .section-heading { font-size: 22px; color: #0f3460; margin: 16px 0 8px; break-after: avoid; page-break-after: avoid; }
  .section-content { font-size: 15px; line-height: 1.8; color: #333; margin-bottom: 0; }
  ${richContentCSS}
  ${customCSS ? `/* ===== Custom Style from Reference Book ===== */ ${customCSS}` : ''}
</style>
</head>
<body>
  ${renderCover(book, `
  <div class="cover">
    <div class="category">${book.language || ''} &bull; ${book.category || 'Book'}</div>
    <h1>${book.title}</h1>
    <div class="divider"></div>
    <div class="author">By ${book.author}</div>
  </div>
  `)}
  ${renderTitleAndCopyrightPage(book)}
  ${renderTOC(book.tableOfContents || [])}
  ${renderChapters(book.chapters || [], book.docSpacing)}
</body></html>`;

// ========== CLASSIC TEMPLATE ==========
const classicTemplate = (book) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(book.title || 'Book')}</title>
<style>
  @page {
    size: A4;
    margin-top: 22mm;
    margin-bottom: 22mm;
    margin-left: 20mm;
    margin-right: 20mm;
  }
  @page :first {
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; color: #2c2c2c; background: #fffef9; }
  .cover { width: 100%; min-height: 100vh; height: 100vh; border: 20px solid #8b4513; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; text-align: center; page-break-after: always; break-after: page; background: #fffef9; }
  .cover h1 { font-size: 48px; font-weight: bold; color: #4a2c0a; margin-bottom: 20px; font-style: italic; }
  .cover .author { font-size: 20px; color: #6b4226; margin-top: 30px; }
  .cover .divider { font-size: 30px; color: #8b4513; margin: 20px 0; }
  .toc { padding: 10px 0 20px 0; page-break-after: always; break-after: page; }
  .toc-title { font-size: 28px; color: #4a2c0a; text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8b4513; padding-bottom: 15px; }
  .toc-list { list-style: none; max-width: 550px; margin: 0 auto; }
  .toc-list li { padding: 9px 0; font-size: 15px; border-bottom: 1px dotted #ccc; color: #555; font-style: italic; break-inside: avoid; page-break-inside: avoid; }
  .chapter { padding: 10px 0 20px 0; page-break-before: always; break-before: page; }
  .chapter-title { font-size: 32px; color: #4a2c0a; text-align: center; margin-bottom: 25px; font-style: italic; break-after: avoid; page-break-after: avoid; }
  .chapter-summary { color: #777; font-size: 14px; text-align: center; margin-bottom: 30px; font-style: italic; break-inside: avoid; page-break-inside: avoid; }
  .section { margin-bottom: 18px; }
  .section-heading { font-size: 20px; color: #6b4226; margin: 16px 0 8px; font-weight: bold; break-after: avoid; page-break-after: avoid; }
  .section-content { font-size: 15px; line-height: 1.85; color: #333; margin-bottom: 0; text-align: justify; }
  ${richContentCSS}
</style>
</head>
<body>
  ${renderCover(book, `
  <div class="cover">
    <div class="divider">✦ ✦ ✦</div>
    <h1>${book.title}</h1>
    <div class="divider">❧</div>
    <div class="author">By ${book.author}</div>
    <div class="divider">✦ ✦ ✦</div>
  </div>
  `)}
  ${renderTitleAndCopyrightPage(book)}
  ${renderTOC(book.tableOfContents || [])}
  ${renderChapters(book.chapters || [], book.docSpacing)}
</body></html>`;

// ========== EDUCATION TEMPLATE ==========
const educationTemplate = (book) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(book.title || 'Book')}</title>
<style>
  @page {
    size: A4;
    margin-top: 22mm;
    margin-bottom: 22mm;
    margin-left: 20mm;
    margin-right: 20mm;
  }
  @page :first {
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #2d3748; background: white; }
  .cover { width: 100%; min-height: 100vh; height: 100vh; background: linear-gradient(160deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 60px; text-align: center; page-break-after: always; break-after: page; }
  .cover .badge { background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 20px; font-size: 13px; margin-bottom: 30px; letter-spacing: 2px; text-transform: uppercase; }
  .cover h1 { font-size: 48px; font-weight: 800; margin-bottom: 20px; }
  .cover .author { font-size: 18px; opacity: 0.9; margin-top: 20px; }
  .toc { padding: 10px 0 20px 0; page-break-after: always; break-after: page; }
  .toc-title { font-size: 28px; color: #667eea; margin-bottom: 25px; }
  .toc-list { list-style: none; }
  .toc-list li { padding: 10px 14px; background: white; margin-bottom: 6px; border-radius: 6px; border-left: 4px solid #667eea; font-size: 14px; color: #4a5568; break-inside: avoid; page-break-inside: avoid; }
  .chapter { padding: 10px 0 20px 0; page-break-before: always; break-before: page; }
  .chapter-title { font-size: 32px; color: #667eea; margin-bottom: 15px; background: #f7f8ff; padding: 16px; border-radius: 8px; break-after: avoid; page-break-after: avoid; }
  .chapter-summary { color: #718096; font-size: 14px; margin-bottom: 25px; background: #fffbf0; border-left: 4px solid #f6ad55; padding: 12px; border-radius: 0 6px 6px 0; break-inside: avoid; page-break-inside: avoid; }
  .section { margin-bottom: 18px; }
  .section-heading { font-size: 20px; color: #553c9a; margin: 16px 0 8px; font-weight: 700; break-after: avoid; page-break-after: avoid; }
  .section-content { font-size: 15px; line-height: 1.8; color: #4a5568; margin-bottom: 0; }
  ${richContentCSS}
</style>
</head>
<body>
  ${renderCover(book, `
  <div class="cover">
    <div class="badge">📚 ${book.category || 'Educational Book'}</div>
    <h1>${book.title}</h1>
    <div class="author">✍️ ${book.author}</div>
  </div>
  `)}
  ${renderTitleAndCopyrightPage(book)}
  ${renderTOC(book.tableOfContents || [])}
  ${renderChapters(book.chapters || [], book.docSpacing)}
</body></html>`;

// ========== MINIMAL TEMPLATE ==========
const minimalTemplate = (book) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(book.title || 'Book')}</title>
<style>
  @page {
    size: A4;
    margin-top: 22mm;
    margin-bottom: 22mm;
    margin-left: 20mm;
    margin-right: 20mm;
  }
  @page :first {
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', sans-serif; color: #222; background: white; }
  .cover { width: 100%; min-height: 100vh; height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 60px; page-break-after: always; break-after: page; border-bottom: 3px solid #222; }
  .cover h1 { font-size: 60px; font-weight: 900; line-height: 1; margin-bottom: 30px; }
  .cover .author { font-size: 18px; color: #666; }
  .cover .category { font-size: 12px; text-transform: uppercase; letter-spacing: 5px; color: #999; margin-bottom: 15px; }
  .toc { padding: 10px 0 20px 0; page-break-after: always; break-after: page; }
  .toc-title { font-size: 12px; text-transform: uppercase; letter-spacing: 5px; color: #999; margin-bottom: 25px; }
  .toc-list { list-style: none; }
  .toc-list li { padding: 11px 0; font-size: 15px; border-bottom: 1px solid #eee; break-inside: avoid; page-break-inside: avoid; }
  .chapter { padding: 10px 0 20px 0; page-break-before: always; break-before: page; }
  .chapter-title { font-size: 38px; font-weight: 800; margin-bottom: 10px; break-after: avoid; page-break-after: avoid; }
  .chapter-summary { color: #999; font-size: 14px; margin-bottom: 30px; break-inside: avoid; page-break-inside: avoid; }
  .section { margin-bottom: 18px; }
  .section-heading { font-size: 18px; font-weight: 700; margin: 16px 0 8px; break-after: avoid; page-break-after: avoid; }
  .section-content { font-size: 15px; line-height: 1.85; color: #444; margin-bottom: 0; }
  ${richContentCSS}
</style>
</head>
<body>
  ${renderCover(book, `
  <div class="cover">
    <div class="category">${book.category || ''} — ${book.language || ''}</div>
    <h1>${book.title}</h1>
    <div class="author">${book.author}</div>
  </div>
  `)}
  ${renderTitleAndCopyrightPage(book)}
  ${renderTOC(book.tableOfContents || [])}
  ${renderChapters(book.chapters || [], book.docSpacing)}
</body></html>`;

// ========== TECHNICAL TEMPLATE ==========
const technicalTemplate = (book) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(book.title || 'Book')}</title>
<style>
  @page {
    size: A4;
    margin-top: 22mm;
    margin-bottom: 22mm;
    margin-left: 20mm;
    margin-right: 20mm;
  }
  @page :first {
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; color: #d4d4d4; background: #1e1e1e; }
  .cover { width: 100%; min-height: 100vh; height: 100vh; background: #1e1e1e; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 60px; page-break-after: always; break-after: page; border-left: 5px solid #569cd6; }
  .cover .comment { color: #6a9955; font-size: 16px; margin-bottom: 20px; }
  .cover h1 { font-size: 48px; font-weight: bold; color: #569cd6; margin-bottom: 10px; }
  .cover .author { font-size: 18px; color: #9cdcfe; }
  .cover .version { font-size: 13px; color: #808080; margin-top: 20px; }
  .toc { padding: 10px 0 20px 0; page-break-after: always; break-after: page; background: #1e1e1e; }
  .toc-title { font-size: 16px; color: #569cd6; margin-bottom: 20px; }
  .toc-list { list-style: none; }
  .toc-list li { padding: 9px 0; font-size: 14px; color: #9cdcfe; border-bottom: 1px solid #333; break-inside: avoid; page-break-inside: avoid; }
  .toc-list li::before { content: "> "; color: #569cd6; }
  .chapter { padding: 10px 0 20px 0; page-break-before: always; break-before: page; background: #1e1e1e; }
  .chapter-title { font-size: 30px; color: #569cd6; margin-bottom: 15px; break-after: avoid; page-break-after: avoid; }
  .chapter-summary { color: #6a9955; font-size: 14px; margin-bottom: 30px; break-inside: avoid; page-break-inside: avoid; }
  .section { margin-bottom: 18px; }
  .section-heading { font-size: 18px; color: #9cdcfe; margin: 16px 0 8px; font-weight: bold; break-after: avoid; page-break-after: avoid; }
  .section-content { font-size: 15px; line-height: 1.8; color: #d4d4d4; margin-bottom: 0; }
  ${richContentCSS}
</style>
</head>
<body>
  ${renderCover(book, `
  <div class="cover">
    <div class="comment">// ${book.category || 'Technical Book'} Documentation</div>
    <h1>${book.title}</h1>
    <div class="author">@author: ${book.author}</div>
    <div class="version">@language: ${book.language || 'English'}</div>
  </div>
  `)}
  ${renderTitlePage(book)}
  ${renderCopyrightPage(book)}
  ${renderTOC(book.tableOfContents || [])}
  ${renderChapters(book.chapters || [], book.docSpacing)}
</body></html>`;

module.exports = { generateHTML };
