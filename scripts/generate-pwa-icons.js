const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outputDir = path.join(__dirname, '../client/public/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Branded Hostel PG SVG with indigo gradient, clean building/bed icon, and crisp geometry
function createIconSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const innerSize = size - padding * 2;
  const rx = isMaskable ? 0 : size * 0.22;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4F46E5" />
        <stop offset="50%" stop-color="#4338CA" />
        <stop offset="100%" stop-color="#312E81" />
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="${size * 0.03}" stdDeviation="${size * 0.03}" flood-color="#000000" flood-opacity="0.3" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bgGrad)" />
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#glowGrad)" />

    <!-- Icon Group -->
    <g transform="translate(${padding}, ${padding})" filter="url(#dropShadow)">
      <!-- Main Hostel Building & Roof Structure -->
      <svg width="${innerSize}" height="${innerSize}" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" fill="#FFFFFF" fill-opacity="0.12" />
        <path d="M9 22V12h6v10" fill="#FFFFFF" fill-opacity="0.25" />
        <path d="M9 7h6" stroke="#A5B4FC" stroke-width="2" />
        <path d="M12 4.5v2.5" stroke="#A5B4FC" stroke-width="2" />
        <!-- Resident / Bed symbol inside door -->
        <circle cx="12" cy="15" r="1.5" fill="#38BDF8" />
      </svg>
    </g>
  </svg>
  `;
}

async function generateAllIcons() {
  const sizes = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  ];

  for (const { name, size, maskable } of sizes) {
    const svgBuffer = Buffer.from(createIconSvg(size, maskable));
    const outputPath = path.join(outputDir, name);
    await sharp(svgBuffer).png().toFile(outputPath);
    console.log(`Generated: ${outputPath} (${size}x${size})`);
  }

  // Apple touch icon (180x180)
  const appleTouchSvg = Buffer.from(createIconSvg(180, false));
  const appleTouchPath = path.join(__dirname, '../client/public/apple-touch-icon.png');
  await sharp(appleTouchSvg).png().toFile(appleTouchPath);
  console.log(`Generated: ${appleTouchPath} (180x180)`);

  // Favicon (64x64)
  const faviconSvg = Buffer.from(createIconSvg(64, false));
  const faviconPath = path.join(__dirname, '../client/public/favicon.png');
  await sharp(faviconSvg).png().toFile(faviconPath);
  console.log(`Generated: ${faviconPath} (64x64)`);
}

generateAllIcons().catch(console.error);
