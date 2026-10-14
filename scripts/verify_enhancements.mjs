import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;
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
  console.log('Launching headless Chrome for Full Verification...');
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

    console.log('1. Verifying Storefront at Desktop (1280x800)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    // Clear stale empty storage if any
    await send('Runtime.evaluate', {
      expression: `(() => {
        const cur = localStorage.getItem('muety_reviews_v1');
        if (!cur || cur === '[]') {
          localStorage.removeItem('muety_reviews_v1');
          window.location.reload();
        }
      })()`
    });
    await sleep(2000);

    // Audit announcement bar count and details
    const desktopAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const topBars = document.querySelectorAll('aside.announcement-bar-top');
        const legacyStrip = document.querySelectorAll('.homepage-announcement-strip');
        const barText = topBars[0] ? topBars[0].textContent : '';
        const reviewsSection = document.querySelector('.reviews-section-redesign');
        const reviewCards = document.querySelectorAll('.review-card-item');

        return {
          topBarFound: topBars.length,
          legacyStripFound: legacyStrip.length,
          barTextSnippet: barText.substring(0, 120),
          reviewsSectionFound: !!reviewsSection,
          reviewCardsCount: reviewCards.length,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()`,
      returnByValue: true
    });
    console.log('Desktop Storefront Audit:', JSON.stringify(desktopAudit.result.value, null, 2));

    // Capture desktop top view
    const snapDesktopTop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'storefront_desktop_unified_announcement.png'), Buffer.from(snapDesktopTop.data, 'base64'));
    console.log('Saved storefront_desktop_unified_announcement.png');

    // Scroll directly to reviews section and capture
    await send('Runtime.evaluate', {
      expression: `(() => {
        const sec = document.querySelector('.reviews-section-redesign');
        if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`
    });
    await sleep(800);
    const snapDesktopReviews = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'storefront_desktop_customer_reviews.png'), Buffer.from(snapDesktopReviews.data, 'base64'));
    console.log('Saved storefront_desktop_customer_reviews.png');

    // Test responsive viewports for overflow
    const viewports = [
      { name: '320px', width: 320, height: 568, mobile: true },
      { name: '360px', width: 360, height: 740, mobile: true },
      { name: '375px', width: 375, height: 667, mobile: true },
      { name: '390px', width: 390, height: 844, mobile: true },
      { name: '425px', width: 425, height: 850, mobile: true },
      { name: '768px', width: 768, height: 1024, mobile: false },
      { name: '1024px', width: 1024, height: 768, mobile: false },
      { name: '1440px', width: 1440, height: 900, mobile: false }
    ];

    console.log('\n2. Testing Responsive Viewports...');
    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await sleep(350);

      const overflowAudit = await send('Runtime.evaluate', {
        expression: `(() => {
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          return {
            scrollW,
            innerW,
            overflow: scrollW > innerW
          };
        })()`,
        returnByValue: true
      });
      const ov = overflowAudit.result.value;
      console.log(`Viewport ${vp.name.padEnd(6)}: innerWidth=${ov.innerW}, scrollWidth=${ov.scrollW}, hasOverflow=${ov.overflow}`);

      if (vp.name === '390px') {
        // Scroll to top
        await send('Runtime.evaluate', { 
          expression: `(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
          })()` 
        });
        await sleep(600);
        const snapMobileTop = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'storefront_mobile_unified_announcement.png'), Buffer.from(snapMobileTop.data, 'base64'));
        console.log('Saved storefront_mobile_unified_announcement.png');


        // Scroll to reviews
        await send('Runtime.evaluate', {
          expression: `(() => {
            const sec = document.querySelector('.reviews-section-redesign');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'center' });
          })()`
        });
        await sleep(300);
        const snapMobileReviews = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'storefront_mobile_customer_reviews.png'), Buffer.from(snapMobileReviews.data, 'base64'));
        console.log('Saved storefront_mobile_customer_reviews.png');
      }
    }

    // 3. Admin Announcements Page
    console.log('\n3. Verifying Admin Announcements Page...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    // Set admin auth in localStorage to access admin panel
    await send('Runtime.evaluate', {
      expression: `(() => {
        const adminUser = {
          id: 'superadmin_01',
          uid: 'superadmin_01',
          email: 'superadmin@muety.in',
          displayName: 'MUETY Executive Super Admin',
          role: 'superadmin',
          roles: ['superadmin', 'admin']
        };
        localStorage.setItem('muety_current_session_user', JSON.stringify(adminUser));
      })()`
    });
    await send('Page.navigate', { url: 'http://localhost:5173/admin/announcements' });
    await sleep(2500);

    const adminAnnounceAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const heading = document.querySelector('h1')?.textContent || '';
        const previewText = document.querySelector('.announcement-bar-top')?.textContent || '';
        const cards = document.querySelectorAll('.card');
        return {
          heading,
          previewText: previewText.substring(0, 80),
          cardCount: cards.length
        };
      })()`,
      returnByValue: true
    });
    console.log('Admin Announcements Page Audit:', JSON.stringify(adminAnnounceAudit.result.value, null, 2));

    const snapAdminAnnounce = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'admin_announcements_dashboard.png'), Buffer.from(snapAdminAnnounce.data, 'base64'));
    console.log('Saved admin_announcements_dashboard.png');

    // 4. Admin Reviews Page
    console.log('\n4. Verifying Admin Customer Reviews Page...');
    await send('Page.navigate', { url: 'http://localhost:5173/admin/reviews' });
    await sleep(2500);

    const adminReviewAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const heading = document.querySelector('h1')?.textContent || '';
        const cards = document.querySelectorAll('.card');
        const thumbs = document.querySelectorAll('img');
        const filterBtns = document.querySelectorAll('button');
        return {
          heading,
          cardCount: cards.length,
          photoThumbsCount: thumbs.length,
          buttonsCount: filterBtns.length
        };
      })()`,
      returnByValue: true
    });

    console.log('Admin Reviews Page Audit:', JSON.stringify(adminReviewAudit.result.value, null, 2));

    const snapAdminReviews = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'admin_reviews_dashboard.png'), Buffer.from(snapAdminReviews.data, 'base64'));
    console.log('Saved admin_reviews_dashboard.png');

    console.log('\nAll verification steps completed successfully!');
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (e) {}
  }
}

run().catch(console.error);
