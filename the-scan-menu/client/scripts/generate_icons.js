import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.resolve(__dirname, '../public/icons/icon.svg');
const iconsDir = path.resolve(__dirname, '../public/icons');
const androidResDir = path.resolve(__dirname, '../../../captain-app/android/app/src/main/res');
const flutterAssetsDir = path.resolve(__dirname, '../../../captain-app/assets/images');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(flutterAssetsDir)) {
  fs.mkdirSync(flutterAssetsDir, { recursive: true });
}

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Web PWA & Favicon Icons
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('Generated icon-192x192.png');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('Generated icon-512x512.png');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'maskable-icon-512x512.png'));
  console.log('Generated maskable-icon-512x512.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'thescanmenu.png'));
  console.log('Generated client thescanmenu.png');

  // 2. Flutter Assets
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(flutterAssetsDir, 'thescanmenu.png'));
  console.log('Generated captain-app thescanmenu.png');

  // 3. Android Mipmap App Launcher Icons
  const androidMipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const mipmap of androidMipmaps) {
    const targetDir = path.join(androidResDir, mipmap.dir);
    if (fs.existsSync(targetDir)) {
      await sharp(svgBuffer)
        .resize(mipmap.size, mipmap.size)
        .png()
        .toFile(path.join(targetDir, 'ic_launcher.png'));
      console.log(`Generated ${mipmap.dir}/ic_launcher.png (${mipmap.size}x${mipmap.size})`);
    }
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
