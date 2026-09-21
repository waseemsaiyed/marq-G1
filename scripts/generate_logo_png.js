import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
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

// Draw MarQ Logo Pixel function
// Returns [r, g, b, a]
function drawMarqLogo(x, y, w, h) {
  // Normalize coords
  const nx = x / w;
  const ny = y / h;

  // Background is transparent or white
  // Let's create high-res clean white card
  let r = 255, g = 255, b = 255, a = 0;

  // Emblem region: nx in [0.05, 0.25], ny in [0.2, 0.85]
  // 1. Solid Blue Crest
  if (nx >= 0.10 && nx <= 0.22 && ny >= 0.35 && ny <= 0.80) {
    const dx = (nx - 0.16) * 10;
    const dy = (ny - 0.58) * 4;
    if (dx * dx + dy * dy < 2.5) {
      return [39, 56, 186, 255]; // Royal Blue #2738BA
    }
  }

  // 2. Orange Swoosh
  const swooshDist = Math.abs((nx - 0.05) * 1.8 - (1.0 - ny));
  if (swooshDist < 0.12 && nx >= 0.04 && nx <= 0.22 && ny >= 0.28 && ny <= 0.88) {
    if (swooshDist < 0.06) {
      return [251, 174, 23, 255]; // Golden Yellow #FBAE17
    }
    return [243, 144, 25, 255]; // Orange #F39019
  }

  // 3. Digital Blocks
  if (nx >= 0.18 && nx <= 0.24 && ny >= 0.16 && ny <= 0.36) {
    const col = Math.floor((nx - 0.18) / 0.02);
    const row = Math.floor((ny - 0.16) / 0.06);
    if ((col + row) % 2 === 0) {
      return [251, 174, 23, 255];
    } else {
      return [39, 56, 186, 255];
    }
  }

  // Wordmark letters region: nx in [0.28, 0.95]
  // In the PNG, render clean solid dark lettering
  if (ny >= 0.35 && ny <= 0.82) {
    // Letter 'm' [0.28 to 0.44]
    if (nx >= 0.28 && nx <= 0.44) {
      const mRel = (nx - 0.28) / 0.16;
      // Stems at 0, 0.5, 1.0; top bar at ny < 0.48
      const nearStem = Math.abs(mRel - 0.06) < 0.06 || Math.abs(mRel - 0.50) < 0.06 || Math.abs(mRel - 0.94) < 0.06;
      const nearTop = ny <= 0.48 && mRel >= 0.06 && mRel <= 0.94;
      if (nearStem || nearTop) return [10, 10, 10, 255];
    }

    // Letter 'a' [0.47 to 0.59]
    if (nx >= 0.47 && nx <= 0.59) {
      const aRel = (nx - 0.47) / 0.12;
      const distCenter = Math.sqrt(Math.pow((aRel - 0.45) * 2, 2) + Math.pow((ny - 0.58) * 5, 2));
      const rightStem = Math.abs(aRel - 0.90) < 0.08;
      if ((distCenter > 0.45 && distCenter < 1.05) || rightStem) return [10, 10, 10, 255];
    }

    // Letter 'r' [0.62 to 0.72]
    if (nx >= 0.62 && nx <= 0.72) {
      const rRel = (nx - 0.62) / 0.10;
      const stem = rRel <= 0.28;
      const shoulder = ny <= 0.52 && rRel >= 0.28;
      if (stem || shoulder) return [10, 10, 10, 255];
    }

    // Letter 'Q' [0.75 to 0.94]
    if (nx >= 0.75 && nx <= 0.94) {
      const qRel = (nx - 0.75) / 0.19;
      const distQ = Math.sqrt(Math.pow((qRel - 0.48) * 2.2, 2) + Math.pow((ny - 0.58) * 4.8, 2));
      const ring = distQ > 0.65 && distQ < 1.15;
      const tail = (qRel - ny * 0.7 > 0.18) && (qRel - ny * 0.7 < 0.40) && ny >= 0.65;
      if (ring || tail) return [10, 10, 10, 255];
    }
  }

  return [r, g, b, a];
}

const logoPng = createPNG(480, 140, drawMarqLogo);
fs.writeFileSync('./public/logo-marq.png', logoPng);
fs.writeFileSync('./public/logo marq.png', logoPng);

console.log('Successfully generated public/logo-marq.png and public/logo marq.png');
