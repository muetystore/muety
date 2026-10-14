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
        if (pageTarget) return pageTarget.webSocketDebuggerUrl;
      }
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('Failed to connect to Chrome remote debugging port.');
}

async function run() {
  console.log('Capturing section scroll verification...');
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

    // Setup recently viewed in localStorage first
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    await send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.setItem('muety_recently_viewed_v1', JSON.stringify(['muety-saree-01']));
        window.location.reload();
      })()`
    });
    await sleep(2000);

    // 1. Capture Desktop 1280px scrolled sections
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(500);

    // Scroll to collections & circular cards
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 750)' });
    await sleep(500);
    const snapDesktopCollections = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_1280_collections.png'), Buffer.from(snapDesktopCollections.data, 'base64'));
    console.log('Saved after_storefront_1280_collections.png');

    // Scroll to craftsmanship & reviews
    await send('Runtime.evaluate', { expression: `
      const revSec = document.querySelector('section[aria-label="Customer Reviews"]');
      if (revSec) revSec.scrollIntoView({ behavior: 'instant', block: 'center' });
      else window.scrollTo(0, 3600);
    ` });
    await sleep(600);
    const snapDesktopReviews = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_1280_reviews.png'), Buffer.from(snapDesktopReviews.data, 'base64'));
    console.log('Saved after_storefront_1280_reviews.png');

    // 2. Capture Mobile 390px
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 700)' });
    await sleep(500);
    const snapMobileProducts = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_390_products.png'), Buffer.from(snapMobileProducts.data, 'base64'));
    console.log('Saved after_storefront_390_products.png');

    // Mobile 390px Customer Reviews carousel
    await send('Runtime.evaluate', { expression: `
      const revSec = document.querySelector('section[aria-label="Customer Reviews"]');
      if (revSec) revSec.scrollIntoView({ behavior: 'instant', block: 'center' });
    ` });
    await sleep(500);
    const snapMobileReviews = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_390_reviews.png'), Buffer.from(snapMobileReviews.data, 'base64'));
    console.log('Saved after_storefront_390_reviews.png');

    // 3. Capture Mobile 320px (matching user's reference screenshots)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 568,
      deviceScaleFactor: 1,
      mobile: true
    });
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
    await sleep(500);
    const snap320Hero = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_320_hero.png'), Buffer.from(snap320Hero.data, 'base64'));
    console.log('Saved after_storefront_320_hero.png');

    // 320px Product Cards
    await send('Runtime.evaluate', { expression: `
      const trendingSec = document.querySelector('section[aria-label="Trending Collections"]');
      if (trendingSec) trendingSec.scrollIntoView({ behavior: 'instant', block: 'start' });
    ` });
    await sleep(500);
    const snap320Cards = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_320_cards.png'), Buffer.from(snap320Cards.data, 'base64'));
    console.log('Saved after_storefront_320_cards.png');

    // 320px Customer Reviews
    const revEval = await send('Runtime.evaluate', { expression: `
      (() => {
        const revSec = document.getElementById('customer-reviews-section');
        if (revSec) {
          revSec.scrollIntoView({ behavior: 'instant', block: 'center' });
          return { found: true, top: revSec.getBoundingClientRect().top, scrollY: window.scrollY };
        }
        return { found: false };
      })()
    `, returnByValue: true });
    console.log('Customer Reviews scroll eval:', revEval.result?.value);
    await sleep(800);
    const snap320Reviews = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_storefront_320_reviews.png'), Buffer.from(snap320Reviews.data, 'base64'));
    console.log('Saved after_storefront_320_reviews.png');

    console.log('All scrolled verification screenshots captured successfully!');
    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('Error during scroll capture:', err);
  process.exit(1);
});
