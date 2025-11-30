const fs = require('fs');

// Create a simple SVG icon and convert to data URL for now
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0f172a"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#10B981"/>
  <text x="${size/2}" y="${size/2+10}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/8}" font-weight="bold">TM</text>
</svg>
`;

// For now, create simple data URI based icons in the manifest
console.log('Creating icon files...');

// Create 192x192 SVG
fs.writeFileSync('icons/icon-192x192.svg', createSVGIcon(192));
fs.writeFileSync('icons/icon-512x512.svg', createSVGIcon(512));

console.log('SVG icons created');
