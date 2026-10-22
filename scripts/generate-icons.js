// scripts/generate-icons.js
// Generates clean PNG icons with raw node zlib (no external dependencies needed)
import fs from "fs";
import path from "path";
import zlib from "zlib";

function createPNG(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk("IHDR", ihdrData);

  // IDAT data
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  const cornerR = width * 0.22;
  // Lens center slightly offset up-left
  const lensCx = width * 0.44;
  const lensCy = height * 0.44;
  const outerR = width * 0.28;
  const innerR = width * 0.21;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle squircle mask
      const inCorner =
        (x < cornerR && y < cornerR && Math.hypot(x - cornerR, y - cornerR) > cornerR) ||
        (x > width - cornerR && y < cornerR && Math.hypot(x - (width - cornerR), y - cornerR) > cornerR) ||
        (x < cornerR && y > height - cornerR && Math.hypot(x - cornerR, y - (height - cornerR)) > cornerR) ||
        (x > width - cornerR && y > height - cornerR && Math.hypot(x - (width - cornerR), y - (height - cornerR)) > cornerR);

      if (inCorner) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      const dx = x - lensCx;
      const dy = y - lensCy;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);

      // Lens handle (diagonal from rim to bottom-right)
      const u = (x - lensCx) + (y - lensCy);
      const v = (y - lensCy) - (x - lensCx);
      const isHandle = u > outerR * 1.3 && u < width * 0.95 && Math.abs(v) < width * 0.055;

      // Lens rim
      const isRim = distToCenter >= innerR && distToCenter <= outerR;

      // Code brackets indicator (< >) inside lens
      const isCodeSymbol =
        distToCenter < innerR * 0.8 &&
        ((Math.abs(Math.abs(x - lensCx) - (y - lensCy)) < width * 0.035 && Math.abs(x - lensCx) < innerR * 0.55));

      if (isRim || isHandle) {
        // Indigo accent for lens frame & handle
        rawData[pxOffset] = 99;
        rawData[pxOffset + 1] = 102;
        rawData[pxOffset + 2] = 241;
        rawData[pxOffset + 3] = 255;
      } else if (isCodeSymbol) {
        // Sky blue for code inside lens
        rawData[pxOffset] = 56;
        rawData[pxOffset + 1] = 189;
        rawData[pxOffset + 2] = 248;
        rawData[pxOffset + 3] = 255;
      } else if (distToCenter < innerR) {
        // Lens glass interior: subtle slate glow
        rawData[pxOffset] = 28;
        rawData[pxOffset + 1] = 37;
        rawData[pxOffset + 2] = 65;
        rawData[pxOffset + 3] = 255;
      } else {
        // Dark background (slate-900)
        rawData[pxOffset] = 15;
        rawData[pxOffset + 1] = 23;
        rawData[pxOffset + 2] = 42;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressedData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const publicDir = path.resolve("public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, "pwa-192x192.png"), createPNG(192, 192));
fs.writeFileSync(path.join(publicDir, "pwa-512x512.png"), createPNG(512, 512));
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), createPNG(180, 180));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#0f172a"/>
  <circle cx="236" cy="236" r="136" stroke="#6366f1" stroke-width="34" />
  <path d="M336 336L440 440" stroke="#6366f1" stroke-width="36" stroke-linecap="round" />
  <path d="M204 184L164 236L204 288" stroke="#38bdf8" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M268 184L308 236L268 288" stroke="#38bdf8" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
fs.writeFileSync(path.join(publicDir, "masked-icon.svg"), svg);

console.log("CodeLens PWA Icons generated successfully!");
