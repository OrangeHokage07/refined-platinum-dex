import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const ICONS_DIR = path.resolve(PUBLIC_DIR, 'icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// SVG for the Sinnoh Pokédex icon
const pokedexSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="shellGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ff4d4d"/>
      <stop offset="60%" stop-color="#cc1111"/>
      <stop offset="100%" stop-color="#880000"/>
    </radialGradient>
    <radialGradient id="lensGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#80d4ff"/>
      <stop offset="40%" stop-color="#1aa3ff"/>
      <stop offset="80%" stop-color="#0066cc"/>
      <stop offset="100%" stop-color="#003366"/>
    </radialGradient>
    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#cccccc" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#333333" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background casing rounded square -->
  <rect x="24" y="24" width="464" height="464" rx="100" fill="url(#shellGrad)" filter="url(#shadow)"/>
  
  <!-- Outer metallic border highlight -->
  <rect x="28" y="28" width="456" height="456" rx="96" fill="none" stroke="url(#metalGrad)" stroke-width="8"/>

  <!-- Top bar / hinge detail -->
  <path d="M 60 140 L 452 140" stroke="#440000" stroke-width="12" stroke-linecap="round"/>
  <path d="M 60 146 L 452 146" stroke="#ff7777" stroke-width="3" stroke-linecap="round"/>

  <!-- Central Camera Lens (Sinnoh Dex eye) -->
  <circle cx="256" cy="280" r="110" fill="#222222" filter="url(#shadow)"/>
  <circle cx="256" cy="280" r="100" fill="#ffffff" stroke="#999999" stroke-width="4"/>
  <circle cx="256" cy="280" r="88" fill="url(#lensGrad)"/>
  
  <!-- Lens specular highlight reflection -->
  <ellipse cx="225" cy="245" rx="36" ry="22" transform="rotate(-30 225 245)" fill="#ffffff" opacity="0.75"/>
  <circle cx="280" cy="305" r="10" fill="#ffffff" opacity="0.4"/>

  <!-- Top indicator lights -->
  <!-- Red light -->
  <circle cx="110" cy="85" r="22" fill="#ff2222" stroke="#440000" stroke-width="4"/>
  <circle cx="104" cy="79" r="7" fill="#ffffff" opacity="0.8"/>

  <!-- Yellow light -->
  <circle cx="170" cy="85" r="22" fill="#ffcc00" stroke="#665500" stroke-width="4"/>
  <circle cx="164" cy="79" r="7" fill="#ffffff" opacity="0.8"/>

  <!-- Green light (active Sinnoh LED) -->
  <circle cx="230" cy="85" r="22" fill="#00e64d" stroke="#004d1a" stroke-width="4"/>
  <circle cx="224" cy="79" r="7" fill="#ffffff" opacity="0.8"/>

  <!-- Speaker holes -->
  <circle cx="390" cy="80" r="6" fill="#440000"/>
  <circle cx="415" cy="80" r="6" fill="#440000"/>
  <circle cx="440" cy="80" r="6" fill="#440000"/>
  <circle cx="390" cy="95" r="6" fill="#440000"/>
  <circle cx="415" cy="95" r="6" fill="#440000"/>
  <circle cx="440" cy="95" r="6" fill="#440000"/>
</svg>
`;

async function main() {
  const svgBuffer = Buffer.from(pokedexSvg);

  // 1. icon-512.png
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('✓ Created public/icons/icon-512.png');

  // 2. icon-192.png
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, 'icon-192.png'));
  console.log('✓ Created public/icons/icon-192.png');

  // 3. apple-touch-icon.png (180x180)
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 4. favicon.ico (using 48x48 png)
  await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
  console.log('✓ Created public/favicon.ico');
}

main().catch(console.error);
