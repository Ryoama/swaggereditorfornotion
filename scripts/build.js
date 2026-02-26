/**
 * Build script for Swagger Preview for Notion
 *
 * Copies source files and node_modules dependencies into the dist/ directory
 * which can be loaded as an unpacked Chrome extension.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const NODE_MODULES = path.join(ROOT, 'node_modules');

/**
 * Remove and recreate the dist directory
 */
function cleanDist() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });
}

/**
 * Copy a file, creating parent directories as needed
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Warning: ${src} does not exist, skipping`);
    return;
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

/**
 * Generate PNG icons from SVG using a canvas-less approach
 * (Creates simple placeholder PNGs with the right dimensions)
 */
function generateIcons() {
  const iconDir = path.join(DIST, 'icons');
  fs.mkdirSync(iconDir, { recursive: true });

  const svgSource = fs.readFileSync(path.join(SRC, 'icons', 'icon.svg'), 'utf-8');

  // Copy SVG as reference
  fs.writeFileSync(path.join(iconDir, 'icon.svg'), svgSource);

  // For PNG generation, we'll create minimal valid PNG files
  // In a real build, you'd use sharp, canvas, or inkscape
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const pngPath = path.join(iconDir, `icon${size}.png`);
    const png = createMinimalPng(size, size);
    fs.writeFileSync(pngPath, png);
  }

  console.log('  Icons generated (16, 48, 128)');
}

/**
 * Create a minimal valid PNG file with a solid color
 */
function createMinimalPng(width, height) {
  // Color: #173647 (the swagger dark blue)
  const r = 0x17, g = 0x36, b = 0x47;

  // Build raw RGBA pixel data
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte: None
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b, 255);
    }
  }

  const rawBuf = Buffer.from(rawData);

  // Deflate the raw data (using zlib)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawBuf);

  // Build PNG file
  const chunks = [];

  // PNG Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(createPngChunk('IHDR', ihdr));

  // IDAT chunk
  chunks.push(createPngChunk('IDAT', compressed));

  // IEND chunk
  chunks.push(createPngChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

/**
 * Create a PNG chunk with length, type, data, and CRC
 */
function createPngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

/**
 * CRC32 calculation for PNG
 */
function crc32(buf) {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let crcTable = null;
function getCrc32Table() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[i] = c;
  }
  return crcTable;
}

/**
 * Main build function
 */
function build() {
  console.log('Building Swagger Preview for Notion...\n');

  // Step 1: Clean dist
  console.log('1. Cleaning dist/');
  cleanDist();

  // Step 2: Copy source files
  console.log('2. Copying source files');
  copyFile(path.join(SRC, 'manifest.json'), path.join(DIST, 'manifest.json'));
  copyFile(path.join(SRC, 'background.js'), path.join(DIST, 'background.js'));
  copyDir(path.join(SRC, 'content'), path.join(DIST, 'content'));
  copyDir(path.join(SRC, 'panel'), path.join(DIST, 'panel'));
  copyDir(path.join(SRC, 'popup'), path.join(DIST, 'popup'));

  // Step 3: Copy dependencies from node_modules
  console.log('3. Copying dependencies');
  const libsDir = path.join(DIST, 'libs');
  fs.mkdirSync(libsDir, { recursive: true });

  // swagger-ui-dist
  const swaggerUiDist = path.join(NODE_MODULES, 'swagger-ui-dist');
  if (fs.existsSync(swaggerUiDist)) {
    copyFile(
      path.join(swaggerUiDist, 'swagger-ui-bundle.js'),
      path.join(libsDir, 'swagger-ui-bundle.js')
    );
    copyFile(
      path.join(swaggerUiDist, 'swagger-ui.css'),
      path.join(libsDir, 'swagger-ui.css')
    );
    console.log('  - swagger-ui-dist copied');
  } else {
    console.error('ERROR: swagger-ui-dist not found. Run "npm install" first.');
    process.exit(1);
  }

  // js-yaml
  const jsYamlDist = path.join(NODE_MODULES, 'js-yaml', 'dist');
  if (fs.existsSync(jsYamlDist)) {
    copyFile(
      path.join(jsYamlDist, 'js-yaml.min.js'),
      path.join(libsDir, 'js-yaml.min.js')
    );
    console.log('  - js-yaml copied');
  } else {
    console.error('ERROR: js-yaml not found. Run "npm install" first.');
    process.exit(1);
  }

  // Step 4: Generate icons
  console.log('4. Generating icons');
  generateIcons();

  // Done
  const distSize = getDirSize(DIST);
  console.log(`\nBuild complete! Output: dist/ (${formatSize(distSize)})`);
  console.log('\nTo load the extension:');
  console.log('  1. Open chrome://extensions/ (or edge://extensions/)');
  console.log('  2. Enable "Developer mode"');
  console.log('  3. Click "Load unpacked"');
  console.log('  4. Select the dist/ folder');
}

function getDirSize(dir) {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  return size;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Run
build();
