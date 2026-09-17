import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(2, 9); // Truecolor (RGB)
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: height rows, each starts with filter type 0, followed by width * 3 bytes (RGB)
  const rowLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // Draw background with nice hospital blue or accent
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Medical cross in the center
      const inCrossH = Math.abs(dy) <= height * 0.08 && Math.abs(dx) <= width * 0.28;
      const inCrossV = Math.abs(dx) <= width * 0.08 && Math.abs(dy) <= height * 0.28;

      if (inCrossH || inCrossV) {
        // Orange accent #FB7800
        rawData[pixelOffset] = 251;
        rawData[pixelOffset + 1] = 120;
        rawData[pixelOffset + 2] = 0;
      } else if (dist < width * 0.44) {
        // Deep medical blue #004F8C
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      } else {
        // Darker blue border
        rawData[pixelOffset] = Math.max(0, r - 30);
        rawData[pixelOffset + 1] = Math.max(0, g - 30);
        rawData[pixelOffset + 2] = Math.max(0, b - 30);
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// Simple CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ 0xFFFFFFFF;
}

// Generate assets
fs.writeFileSync('./public/pwa-192x192.png', createPNG(192, 192, 0, 79, 140));
fs.writeFileSync('./public/pwa-512x512.png', createPNG(512, 512, 0, 79, 140));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPNG(512, 512, 0, 79, 140));
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180, 0, 79, 140));
fs.writeFileSync('./public/favicon.ico', createPNG(64, 64, 0, 79, 140));

console.log('Generated PNG icons successfully!');
