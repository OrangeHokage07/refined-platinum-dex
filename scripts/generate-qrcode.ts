import path from 'node:path';
import QRCode from 'qrcode';

const TARGET_URL = 'https://orangehokage07.github.io/refined-platinum-dex/';
const OUTPUT_PATH = path.resolve(process.cwd(), 'qrcode.png');

async function main() {
  await QRCode.toFile(OUTPUT_PATH, TARGET_URL, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    scale: 10,
    color: {
      dark: '#820b12', // Pokédex red
      light: '#ffffff'
    }
  });
  console.log(`✓ Generated QR code at ${OUTPUT_PATH} for ${TARGET_URL}`);
}

main().catch(console.error);

