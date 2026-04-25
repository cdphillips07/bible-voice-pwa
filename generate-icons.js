const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "public");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0d0a07";
  ctx.fillRect(0, 0, size, size);

  // Subtle radial glow
  const grd = ctx.createRadialGradient(size/2, size/2, size*0.1, size/2, size/2, size*0.6);
  grd.addColorStop(0, "rgba(201,168,76,0.15)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  // Gold cross / star symbol ✦
  const fontSize = size * 0.45;
  ctx.fillStyle = "#c9a84c";
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

// Generate all required sizes
const sizes = [
  { name: "icon-192.png",       size: 192 },
  { name: "icon-512.png",       size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon.ico",        size: 64  },
];

sizes.forEach(({ name, size }) => {
  const buf = drawIcon(size);
  fs.writeFileSync(path.join(outputDir, name), buf);
  console.log(`✓ Generated ${name} (${size}x${size})`);
});

console.log("\nAll icons generated in /public");
