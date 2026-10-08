import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting asset optimization and favicon generation...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Favicon PNGs from favicon.svg
  const svgPath = path.resolve('./public/favicon.svg');
  if (fs.existsSync(svgPath)) {
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const svgBase64 = Buffer.from(svgContent).toString('base64');
    const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

    const sizes = [
      { name: 'favicon-16x16.png', size: 16 },
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'android-chrome-192x192.png', size: 192 },
      { name: 'android-chrome-512x512.png', size: 512 },
    ];

    for (const { name, size } of sizes) {
      const dataUrl = await page.evaluate(async ({ uri, s }) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = s;
            canvas.height = s;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, s, s);
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = uri;
        });
      }, { uri: svgDataUri, s: size });

      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      fs.writeFileSync(path.resolve('./public', name), buf);
      console.log(`Generated ./public/${name} (${buf.length} bytes)`);
    }

    // Generate a valid favicon.ico containing the 32x32 PNG (modern ICO containers wrap PNG)
    const png32 = fs.readFileSync(path.resolve('./public/favicon-32x32.png'));
    // Simple standard ICO container wrapping single 32x32 PNG image:
    // ICONDIR: 2 bytes reserved (0), 2 bytes type (1 = ICO), 2 bytes count (1)
    // ICONDIRENTRY:
    // bWidth (32), bHeight (32), bColorCount (0), bReserved (0),
    // wPlanes (1), wBitCount (32), dwBytesInRes (png32.length), dwImageOffset (22)
    const icoHeader = Buffer.alloc(22);
    icoHeader.writeUInt16LE(0, 0); // reserved
    icoHeader.writeUInt16LE(1, 2); // ICO type
    icoHeader.writeUInt16LE(1, 4); // 1 image
    icoHeader.writeUInt8(32, 6);   // width 32
    icoHeader.writeUInt8(32, 7);   // height 32
    icoHeader.writeUInt8(0, 8);    // color count
    icoHeader.writeUInt8(0, 9);    // reserved
    icoHeader.writeUInt16LE(1, 10); // color planes
    icoHeader.writeUInt16LE(32, 12); // bits per pixel
    icoHeader.writeUInt32LE(png32.length, 14); // image size
    icoHeader.writeUInt32LE(22, 18); // offset where PNG starts
    const icoBuffer = Buffer.concat([icoHeader, png32]);
    fs.writeFileSync(path.resolve('./public/favicon.ico'), icoBuffer);
    console.log(`Generated ./public/favicon.ico (${icoBuffer.length} bytes)`);
  }

  // 2. Compress JPEG images in public/products
  const prodDir = path.resolve('./public/products');
  if (fs.existsSync(prodDir)) {
    const files = fs.readdirSync(prodDir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
    let totalSaved = 0;
    for (const f of files) {
      const fullPath = path.join(prodDir, f);
      const origBuf = fs.readFileSync(fullPath);
      const b64 = origBuf.toString('base64');

      const result = await page.evaluate(async (rawB64) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDimension = 1200;
            const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // 82% quality delivers virtually identical visual clarity with huge compression
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.src = 'data:image/jpeg;base64,' + rawB64;
        });
      }, b64);

      const optimizedBuf = Buffer.from(result.split(',')[1], 'base64');
      if (optimizedBuf.length < origBuf.length) {
        fs.writeFileSync(fullPath, optimizedBuf);
        const saved = origBuf.length - optimizedBuf.length;
        totalSaved += saved;
        console.log(`Optimized ${f}: ${(origBuf.length / 1024).toFixed(0)}KB -> ${(optimizedBuf.length / 1024).toFixed(0)}KB (saved ${(saved / 1024).toFixed(0)}KB)`);
      } else {
        console.log(`Skipped ${f}: already optimal`);
      }
    }
    console.log(`Total storage & bandwidth saved: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB`);
  }

  await browser.close();
  console.log('Asset optimization complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
