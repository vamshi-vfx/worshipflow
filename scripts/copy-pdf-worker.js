const fs = require("fs");
const path = require("path");

const possibleWorkers = [
  "pdf.worker.min.mjs",
  "pdf.worker.mjs",
  "pdf.worker.min.js",
  "pdf.worker.js",
];

const nodeModulesDir = path.resolve(__dirname, "..", "node_modules", "pdfjs-dist", "build");
const publicDir = path.resolve(__dirname, "..", "public");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

let copied = false;
for (const worker of possibleWorkers) {
  const src = path.join(nodeModulesDir, worker);
  if (fs.existsSync(src)) {
    const dest = path.join(publicDir, worker);
    fs.copyFileSync(src, dest);
    console.log(`Copied PDF.js worker: ${worker} -> public/${worker}`);
    copied = true;
    break;
  }
}

if (!copied) {
  console.warn("PDF.js worker not found in node_modules/pdfjs-dist/build/. PDF import may fail.");
  process.exit(1);
}
