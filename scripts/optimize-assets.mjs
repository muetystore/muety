import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');

async function optimizeImages() {
  console.log('Optimizing public image assets...');

  // 1. Diwali Hero Banner (keep original public/diwali_hero_banner.jpg for test requirements)
  const diwaliPath = path.join(publicDir, 'diwali_hero_banner.jpg');
  if (fs.existsSync(diwaliPath)) {
    // Desktop WebP (1376w)
    await sharp(diwaliPath)
      .resize({ width: 1376 })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(publicDir, 'diwali_hero_banner.webp'));
    console.log('✓ Created diwali_hero_banner.webp');

    // Mobile WebP (640w)
    await sharp(diwaliPath)
      .resize({ width: 640 })
      .webp({ quality: 80, effort: 6 })
      .toFile(path.join(publicDir, 'diwali_hero_banner_mobile.webp'));
    console.log('✓ Created diwali_hero_banner_mobile.webp');

    // Mobile JPG fallback (640w)
    await sharp(diwaliPath)
      .resize({ width: 640 })
      .jpeg({ quality: 80, progressive: true })
      .toFile(path.join(publicDir, 'diwali_hero_banner_mobile.jpg'));
    console.log('✓ Created diwali_hero_banner_mobile.jpg');
  }

  // 2. Dasara Campaign Banner
  const dasaraPath = path.join(publicDir, 'dasara_campaign_banner_with_text.jpg');
  if (fs.existsSync(dasaraPath)) {
    // Desktop WebP (1376w)
    await sharp(dasaraPath)
      .resize({ width: 1376 })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(publicDir, 'dasara_campaign_banner_with_text.webp'));
    console.log('✓ Created dasara_campaign_banner_with_text.webp');

    // Mobile WebP (640w)
    await sharp(dasaraPath)
      .resize({ width: 640 })
      .webp({ quality: 80, effort: 6 })
      .toFile(path.join(publicDir, 'dasara_campaign_banner_mobile.webp'));
    console.log('✓ Created dasara_campaign_banner_mobile.webp');

    // Mobile JPG fallback (640w)
    await sharp(dasaraPath)
      .resize({ width: 640 })
      .jpeg({ quality: 80, progressive: true })
      .toFile(path.join(publicDir, 'dasara_campaign_banner_mobile.jpg'));
    console.log('✓ Created dasara_campaign_banner_mobile.jpg');
  }

  // 3. Logo optimization
  const logoPath = path.join(publicDir, 'muety-logo.png');
  if (fs.existsSync(logoPath)) {
    await sharp(logoPath)
      .resize({ width: 360 })
      .webp({ quality: 90, effort: 6 })
      .toFile(path.join(publicDir, 'muety-logo.webp'));
    console.log('✓ Created muety-logo.webp');

    // Optimized PNG (360px wide for header/favicon)
    await sharp(logoPath)
      .resize({ width: 360 })
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(publicDir, 'muety-logo-opt.png'));
    console.log('✓ Created muety-logo-opt.png');
  }

  // 4. Sample model & fabric detail images
  const sampleImages = [
    'saree_fabric_detail.jpg',
    'saree_model_drape.jpg',
    'saree_model_individual.jpg'
  ];

  for (const imgName of sampleImages) {
    const imgPath = path.join(publicDir, imgName);
    if (fs.existsSync(imgPath)) {
      const baseName = path.parse(imgName).name;
      await sharp(imgPath)
        .resize({ width: 800 })
        .webp({ quality: 80, effort: 6 })
        .toFile(path.join(publicDir, `${baseName}.webp`));
      console.log(`✓ Created ${baseName}.webp`);
    }
  }

  console.log('Asset optimization complete.');
}

optimizeImages().catch(err => {
  console.error('Error optimizing images:', err);
  process.exit(1);
});
