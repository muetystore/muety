import fs from 'node:fs';
import path from 'node:path';

/**
 * Multi-Domain Distribution Preparation Script for MUETY
 * 
 * Prepares the production 'dist/' directory to serve:
 * - https://admin.muety.in  -> Admin Panel (SPA /index.html)
 * - https://store.muety.in  -> Storefront (SPA /index.html)
 * - https://muety.in        -> Countdown / Launch (/countdown.html & /Countown/*)
 * - https://www.muety.in    -> Countdown / Launch (/countdown.html & /Countown/*)
 */

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const countownDir = path.join(rootDir, 'Countown');
const publicDir = path.join(rootDir, 'public');

console.log('[prepare-dist] Starting multi-domain distribution packaging...');

if (!fs.existsSync(distDir)) {
  console.error('[prepare-dist] FATAL: dist/ directory does not exist. Run vite build first.');
  process.exit(1);
}

if (!fs.existsSync(countownDir)) {
  console.error('[prepare-dist] FATAL: Countown/ directory does not exist.');
  process.exit(1);
}

// Helper: Copy file with validation
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// Helper: Recursive directory copy
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Package Countdown entry point as /countdown.html
const countownHtml = path.join(countownDir, 'index.html');
const distCountdownHtml = path.join(distDir, 'countdown.html');
copyFile(countownHtml, distCountdownHtml);
console.log('✓ Packaged dist/countdown.html');

// 2. Package complete Countown/ directory into dist/Countown/
const distCountownDir = path.join(distDir, 'Countown');
copyDir(countownDir, distCountownDir);
console.log('✓ Packaged dist/Countown/ directory');

// 3. Package root-level static assets required by countdown relative references
copyFile(path.join(countownDir, 'style.css'), path.join(distDir, 'style.css'));
copyFile(path.join(countownDir, 'script.js'), path.join(distDir, 'script.js'));
copyFile(path.join(countownDir, 'terms-and-conditions.html'), path.join(distDir, 'terms-and-conditions.html'));
copyFile(path.join(countownDir, 'privacy-policy.html'), path.join(distDir, 'privacy-policy.html'));
console.log('✓ Packaged countdown root scripts, styles, and legal documents');

// 4. Package countdown images into dist/assets/images/ (preserving relative paths in countdown HTML)
const countownImagesDir = path.join(countownDir, 'assets', 'images');
const distImagesDir = path.join(distDir, 'assets', 'images');
if (fs.existsSync(countownImagesDir)) {
  copyDir(countownImagesDir, distImagesDir);
  console.log('✓ Packaged countdown image assets into dist/assets/images/');
}

// 5. Ensure _redirects is present in dist/
const publicRedirects = path.join(publicDir, '_redirects');
const distRedirects = path.join(distDir, '_redirects');
if (fs.existsSync(publicRedirects)) {
  copyFile(publicRedirects, distRedirects);
  console.log('✓ Packaged dist/_redirects from public/_redirects');
}

// 6. Validation Verification Checks
const requiredFiles = [
  { path: path.join(distDir, 'index.html'), label: 'Storefront & Admin SPA entry point' },
  { path: path.join(distDir, 'countdown.html'), label: 'Countdown & Launch entry point' },
  { path: path.join(distDir, 'style.css'), label: 'Countdown stylesheet' },
  { path: path.join(distDir, 'script.js'), label: 'Countdown application logic' },
  { path: path.join(distDir, 'terms-and-conditions.html'), label: 'Terms and conditions page' },
  { path: path.join(distDir, 'privacy-policy.html'), label: 'Privacy policy page' },
  { path: path.join(distDir, 'assets', 'images', 'hero.jpg'), label: 'Countdown hero image asset' },
  { path: path.join(distDir, 'Countown', 'index.html'), label: 'Full Countown mirror entry' },
  { path: path.join(distDir, '_redirects'), label: 'Netlify multi-domain redirect map' }
];

let hasErrors = false;
console.log('\n[prepare-dist] Verifying packaged output integrity:');
for (const req of requiredFiles) {
  if (!fs.existsSync(req.path)) {
    console.error(`  ✗ MISSING: ${req.label} (${path.relative(rootDir, req.path)})`);
    hasErrors = true;
  } else {
    const stats = fs.statSync(req.path);
    if (stats.size === 0) {
      console.error(`  ✗ EMPTY: ${req.label} (${path.relative(rootDir, req.path)})`);
      hasErrors = true;
    } else {
      console.log(`  ✓ VERIFIED: ${req.label} (${stats.size} bytes)`);
    }
  }
}

if (hasErrors) {
  console.error('\n[prepare-dist] Build packaging failed due to missing verification files.');
  process.exit(1);
}

console.log('\n[prepare-dist] ✓ Distribution packaging complete and validated for all 3 domains.\n');
