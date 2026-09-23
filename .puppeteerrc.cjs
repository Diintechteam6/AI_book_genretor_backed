const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Download Chrome inside project directory so Render runtime preserves it
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
