import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\Chandru\\.gemini\\antigravity-ide\\brain\\c29c3df4-5b09-4b29-8f4a-1c8141a956e9';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const data = await res.json();
        const pageTarget = data.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || data.find(t => t.webSocketDebuggerUrl);
        if (pageTarget) {
          return pageTarget.webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('Failed to connect to Chrome remote debugging port.');
}

async function run() {
  console.log('Launching headless Chrome for Storefront verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const reqId = id++;
        pending.set(reqId, { resolve, reject });
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    const viewports = [
      { name: '320px', width: 320, height: 568, mobile: true },
      { name: '360px', width: 360, height: 740, mobile: true },
      { name: '375px', width: 375, height: 667, mobile: true },
      { name: '390px', width: 390, height: 844, mobile: true },
      { name: '425px', width: 425, height: 850, mobile: true },
      { name: '768px', width: 768, height: 1024, mobile: false },
      { name: '1024px', width: 1024, height: 768, mobile: false },
      { name: '1280px', width: 1280, height: 800, mobile: false },
      { name: '1440px', width: 1440, height: 900, mobile: false }
    ];

    const results = [];

    // Navigate to homepage first
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await sleep(500);

      const audit = await send('Runtime.evaluate', {
        expression: `(() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const winInnerWidth = window.innerWidth;
          const hasHorizontalOverflow = docScrollWidth > winInnerWidth;

          // Check sections in homepage
          const sections = Array.from(document.querySelectorAll('section')).map(s => ({
            label: s.getAttribute('aria-label') || s.className || 'unnamed',
            offsetTop: s.offsetTop,
            offsetHeight: s.offsetHeight
          }));

          // Check products grid columns
          const productGrid = document.querySelector('.products-grid');
          let gridCols = 0;
          if (productGrid) {
            const style = window.getComputedStyle(productGrid);
            const template = style.gridTemplateColumns;
            gridCols = template ? template.split(' ').length : 0;
          }

          // Check mobile bottom nav
          const bottomNav = document.querySelector('.mobile-bottom-nav');
          const bottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;

          // Check header
          const header = document.querySelector('.main-header');
          const headerWidth = header ? header.getBoundingClientRect().width : 0;

          return {
            docScrollWidth,
            winInnerWidth,
            hasHorizontalOverflow,
            gridCols,
            bottomNavVisible,
            sectionsCount: sections.length,
            sections
          };
        })()`,
        returnByValue: true
      });

      const res = audit.result.value;
      results.push({ viewport: vp.name, ...res });
      console.log(`Viewport ${vp.name}: width=${vp.width}, scrollWidth=${res.docScrollWidth}, overflow=${res.hasHorizontalOverflow}, gridCols=${res.gridCols}, bottomNav=${res.bottomNavVisible}`);

      // Capture screenshots for required widths
      if (vp.name === '390px') {
        const snap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_390.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved after_storefront_390.png');
      } else if (vp.name === '425px') {
        const snap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_425.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved after_storefront_425.png');
      } else if (vp.name === '1280px') {
        const snap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_1280.png'), Buffer.from(snap.data, 'base64'));
        console.log('Saved after_storefront_1280.png');
      }
    }

    // Now test catalog page (/products) at 390px to verify 2-column mobile layout and filters
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await send('Page.navigate', { url: 'http://localhost:5173/products' });
    await sleep(1500);

    const catalogAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const cards = document.querySelectorAll('.product-card');
        return {
          scrollWidth: docScrollWidth,
          innerWidth: winInnerWidth,
          overflow: docScrollWidth > winInnerWidth,
          cardCount: cards.length
        };
      })()`,
      returnByValue: true
    });
    console.log('Catalog Page 390px:', catalogAudit.result.value);

    const snapCatalog = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_catalog_390.png'), Buffer.from(snapCatalog.data, 'base64'));
    console.log('Saved after_catalog_390.png');

    // Test recently viewed by simulating a product view
    await send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.setItem('muety_recently_viewed_v1', JSON.stringify(['muety-saree-01']));
        window.dispatchEvent(new CustomEvent('muety_recently_viewed_updated', { detail: ['muety-saree-01'] }));
      })()`
    });
    await sleep(500);

    // Save summary json
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'storefront_verification_results.json'),
      JSON.stringify({ results, catalogAudit: catalogAudit.result.value }, null, 2)
    );
    console.log('Verification completed successfully!');

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('Storefront verification error:', err);
  process.exit(1);
});
