import fs from 'node:fs';
import path from 'node:path';

/**
 * Multi-Domain Distribution Preparation Script for MUETY
 * 
 * Prepares the production 'dist/' directory to serve:
 * - https://admin.muety.in  -> Admin Panel (SPA /index.html)
 * - https://store.muety.in  -> Storefront (SPA /index.html)
 * - https://muety.in        -> Countdown / Launch (/countdown.html & /countdown/*)
 * - https://www.muety.in    -> Countdown / Launch (/countdown.html & /countdown/*)
 */

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const countdownDir = path.join(rootDir, 'countdown');
const publicDir = path.join(rootDir, 'public');

console.log('[prepare-dist] Starting multi-domain distribution packaging...');

if (!fs.existsSync(distDir)) {
  console.error('[prepare-dist] FATAL: dist/ directory does not exist. Run vite build first.');
  process.exit(1);
}

if (!fs.existsSync(countdownDir)) {
  console.error('[prepare-dist] FATAL: countdown/ directory does not exist.');
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

// Helper: Recursive directory copy with exclusion filter
function copyDir(src, dest, ignoreFilter = () => false) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreFilter(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, ignoreFilter);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper: Read environment variables for countdown build configuration
function getCountdownBuildConfig() {
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(countdownDir, '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const eqIdx = line.indexOf('=');
          if (eqIdx > 0) {
            const key = line.substring(0, eqIdx).trim();
            let val = line.substring(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (key && !(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }

  const launchDateIso = process.env.LAUNCH_DATE || process.env.VITE_LAUNCH_DATE || '2026-10-18T08:00:00+05:30';
  const establishment = process.env.LAUNCH_ESTABLISHMENT || process.env.VITE_LAUNCH_ESTABLISHMENT || process.env.ESTABLISHMENT_YEAR || '2026';
  const mode = (process.env.MUETY_LAUNCH_MODE || 'production').toLowerCase();
  const establishmentDisplay = isNaN(Number(establishment))
    ? establishment
    : `Est. ${establishment} • Royal Weaves`;

  return {
    status: (mode === 'preview' || mode === 'force_live') ? 'LIVE' : (Date.now() >= new Date(launchDateIso).getTime() ? 'LIVE' : 'PRE_LAUNCH'),
    launchAt: launchDateIso,
    launchTimestamp: new Date(launchDateIso).getTime(),
    establishment,
    establishmentDisplay,
    storeUrl: process.env.MUETY_STORE_URL || process.env.STORE_URL || 'https://store.muety.in',
    mode
  };
}

function writeConfiguredHtml(srcHtmlPath, destHtmlPath, config) {
  let content = fs.readFileSync(srcHtmlPath, 'utf8');
  const injection = `<script id="__MUETY_ENV__">window.__MUETY_LAUNCH_CONFIG__ = ${JSON.stringify(config)};</script>`;
  if (content.includes('</head>')) {
    content = content.replace('</head>', `${injection}\n</head>`);
  } else {
    content = injection + '\n' + content;
  }
  const destDir = path.dirname(destHtmlPath);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(destHtmlPath, content, 'utf8');
}

const buildConfig = getCountdownBuildConfig();

// 1. Package Countdown entry point as /countdown.html with injected config
const countdownHtml = path.join(countdownDir, 'index.html');
const distCountdownHtml = path.join(distDir, 'countdown.html');
writeConfiguredHtml(countdownHtml, distCountdownHtml, buildConfig);
console.log('✓ Packaged dist/countdown.html (with injected env config)');

// 2. Package complete countdown/ directory into dist/countdown/ (excluding non-web source files)
const distCountdownDir = path.join(distDir, 'countdown');
copyDir(countdownDir, distCountdownDir, (name) => {
  return name.startsWith('.env') || name.startsWith('.git') || name.endsWith('.md') || name === 'server.js';
});
// Also inject config into dist/countdown/index.html
writeConfiguredHtml(countdownHtml, path.join(distCountdownDir, 'index.html'), buildConfig);
console.log('✓ Packaged dist/countdown/ directory (with injected env config)');

// Backward compatibility mirror for dist/Countown/
const distLegacyCountownDir = path.join(distDir, 'Countown');
copyDir(countdownDir, distLegacyCountownDir, (name) => {
  return name.startsWith('.env') || name.startsWith('.git') || name.endsWith('.md') || name === 'server.js';
});
writeConfiguredHtml(countdownHtml, path.join(distLegacyCountownDir, 'index.html'), buildConfig);

// 3. Package root-level static assets required by countdown relative references
copyFile(path.join(countdownDir, 'style.css'), path.join(distDir, 'style.css'));
copyFile(path.join(countdownDir, 'script.js'), path.join(distDir, 'script.js'));
copyFile(path.join(countdownDir, 'terms-and-conditions.html'), path.join(distDir, 'terms-and-conditions.html'));
copyFile(path.join(countdownDir, 'privacy-policy.html'), path.join(distDir, 'privacy-policy.html'));
console.log('✓ Packaged countdown root scripts, styles, and legal documents');

// 4. Package countdown images into dist/assets/images/ (preserving relative paths in countdown HTML)
const countdownImagesDir = path.join(countdownDir, 'assets', 'images');
const distImagesDir = path.join(distDir, 'assets', 'images');
if (fs.existsSync(countdownImagesDir)) {
  copyDir(countdownImagesDir, distImagesDir);
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
  { path: path.join(distDir, 'countdown', 'index.html'), label: 'Full countdown mirror entry' },
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
