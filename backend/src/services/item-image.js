const sharp = require('sharp');

const allowedFormats = new Set(['jpeg', 'png', 'webp']);
const maximumOutputBytes = 2 * 1024 * 1024;

async function processItemImage(buffer) {
  let pipeline;
  try {
    pipeline = sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 });
    const metadata = await pipeline.metadata();
    if (!allowedFormats.has(metadata.format)) {
      const error = new Error('Image must be a JPEG, PNG, or WebP file');
      error.status = 400;
      error.code = 'INVALID_IMAGE_FORMAT';
      throw error;
    }
    const result = await pipeline
      .rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > maximumOutputBytes) {
      const error = new Error('Optimized image is too large. Choose a smaller image.');
      error.status = 413;
      error.code = 'IMAGE_TOO_LARGE';
      throw error;
    }
    return { data: result.data, width: result.info.width, height: result.info.height };
  } catch (error) {
    if (error.status) throw error;
    const invalid = new Error('The uploaded file is not a valid supported image');
    invalid.status = 400;
    invalid.code = 'INVALID_IMAGE';
    throw invalid;
  }
}

module.exports = { processItemImage };
