// Fix: Convert JPEG-disguised-as-PNG files to real PNG format
// Root cause: worshipflow-logo.png and worshipflow-icon.png have FF D8 FF (JPEG) magic bytes
// but .png extension — Vercel's Linux image optimizer rejects the format mismatch.

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function convertToRealPng(inputPath, label) {
  const abs = resolve(ROOT, inputPath);
  const inBuf = readFileSync(abs);
  const meta = await sharp(inBuf).metadata();
  console.log(`  ${label}: detected format = ${meta.format}, ${meta.width}x${meta.height}`);
  
  const outBuf = await sharp(inBuf).png({ compressionLevel: 6 }).toBuffer();
  writeFileSync(abs, outBuf);
  
  const verify = await sharp(outBuf).metadata();
  console.log(`  ${label}: converted -> ${verify.format}, ${(outBuf.length/1024).toFixed(0)} KB ✓`);
  return outBuf;
}

async function generateIcon(sourceBuf, sourceMeta, outputPath, size, label) {
  const abs = resolve(ROOT, outputPath);
  const cropH = Math.round(sourceMeta.height * 0.68);
  const cropX = Math.round((sourceMeta.width - cropH) / 2);
  
  const outBuf = await sharp(sourceBuf)
    .extract({ left: cropX, top: 0, width: cropH, height: cropH })
    .resize(size, size)
    .png({ compressionLevel: 6 })
    .toBuffer();
  writeFileSync(abs, outBuf);
  const m = await sharp(outBuf).metadata();
  console.log(`  ${label}: ${m.format} ${size}x${size} ✓`);
}

async function main() {
  console.log('\n=== WorshipFlow Brand Asset Fixer ===\n');

  // Step 1: Fix the main logo
  console.log('[1] Converting main logo (JPEG -> real PNG)...');
  const logoBuf = await (async () => {
    const abs = resolve(ROOT, 'public/brand/worshipflow-logo.png');
    const inBuf = readFileSync(abs);
    const meta = await sharp(inBuf).metadata();
    console.log(`    Input:  format=${meta.format}, ${meta.width}x${meta.height}`);
    const outBuf = await sharp(inBuf).png({ compressionLevel: 6 }).toBuffer();
    writeFileSync(abs, outBuf);
    const v = await sharp(outBuf).metadata();
    console.log(`    Output: format=${v.format}, ${v.width}x${v.height}, ${(outBuf.length/1024).toFixed(0)}KB ✓`);
    return { buf: outBuf, meta: v };
  })();

  // Step 2: Fix icon copy
  console.log('\n[2] Converting icon copy (JPEG -> real PNG)...');
  await convertToRealPng('public/brand/worshipflow-icon.png', 'worshipflow-icon.png');

  // Step 3: Regenerate all cropped favicon assets from the now-correct PNG
  console.log('\n[3] Regenerating all icon variants from correct PNG source...');
  const variants = [
    ['public/brand/favicon-32.png',    32,  'public/brand/favicon-32.png'],
    ['public/brand/favicon-64.png',    64,  'public/brand/favicon-64.png'],
    ['public/brand/favicon-192.png',   192, 'public/brand/favicon-192.png'],
    ['public/brand/apple-icon-180.png',180, 'public/brand/apple-icon-180.png'],
    ['src/app/icon.png',               32,  'src/app/icon.png'],
    ['src/app/apple-icon.png',         180, 'src/app/apple-icon.png'],
    ['public/icon.png',                192, 'public/icon.png'],
    ['public/apple-icon.png',          180, 'public/apple-icon.png'],
  ];

  for (const [path, size, label] of variants) {
    await generateIcon(logoBuf.buf, logoBuf.meta, path, size, label);
  }

  // Step 4: Final verification
  console.log('\n[4] Final verification (magic bytes check)...');
  const allFiles = [
    'public/brand/worshipflow-logo.png',
    'public/brand/worshipflow-icon.png',
    ...variants.map(v => v[0]),
  ];
  const seen = new Set();
  for (const f of allFiles) {
    if (seen.has(f)) continue;
    seen.add(f);
    const b = readFileSync(resolve(ROOT, f));
    const magic = b.slice(0, 4).toString('hex');
    const isPng = magic.startsWith('89504e47');
    const isJpeg = magic.startsWith('ffd8ff');
    const status = isPng ? '✓ PNG' : isJpeg ? '✗ JPEG (not fixed!)' : `? ${magic}`;
    console.log(`    ${f}: ${status}`);
  }

  console.log('\n=== Fix complete! ===\n');
  console.log('Next steps:');
  console.log('  npm run build');
  console.log('  git add public/brand src/app/icon.png src/app/apple-icon.png public/icon.png public/apple-icon.png');
  console.log('  git commit -m "Fix: Convert JPEG-as-PNG brand assets to real PNG format"');
  console.log('  git push origin main\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
