#!/usr/bin/env node
/**
 * Generates PNG icons from icons/icon.svg using the `sharp` library.
 * Produces icons/icon16.png, icons/icon48.png, icons/icon128.png.
 *
 * Falls back to a minimal coloured square if sharp is unavailable.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SVG_FILE  = path.join(ICONS_DIR, 'icon.svg');
const SIZES     = [16, 48, 128];

// Minimal valid 1×1 blue PNG (fallback placeholder)
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBgIAs' +
  'YNfqAAAAABJRU5ErkJggg==',
  'base64'
);

async function generateWithSharp() {
  const sharp = require('sharp');
  const svg   = fs.readFileSync(SVG_FILE);

  for (const size of SIZES) {
    const dest = path.join(ICONS_DIR, `icon${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(dest);
    console.log(`  ✓ Generated ${path.basename(dest)}`);
  }
}

function generatePlaceholders() {
  for (const size of SIZES) {
    const dest = path.join(ICONS_DIR, `icon${size}.png`);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, PLACEHOLDER_PNG);
      console.log(`  ⚠ Wrote placeholder ${path.basename(dest)} (install sharp for real icons)`);
    }
  }
}

(async () => {
  console.log('Generating icons…');
  try {
    await generateWithSharp();
    console.log('Icons generated successfully.');
  } catch (err) {
    console.warn(`sharp unavailable (${err.message}); falling back to placeholders.`);
    generatePlaceholders();
  }
})();
