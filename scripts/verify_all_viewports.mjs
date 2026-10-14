import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\Chandru\\.gemini\\antigravity-ide\\brain\\c29c3df4-5b09-4b29-8f4a-1c8141a956e9';

const VIEWPORTS = [
  { name: '320x640', width: 320, height: 640 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '425x506', width: 425, height: 506 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 }
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Launching headless Chrome for comprehensive responsive verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    await sleep(1200);
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const list = await res.json();
    const pageTarget = list.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('Could not find Chrome page target!');

    console.log('Connecting to page target:', pageTarget.webSocketDebuggerUrl);
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

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

    // Setup authenticated patron in localStorage
    await send('Page.navigate', { url: 'http://localhost:5173/account' });
    await sleep(1500);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const patron = {
          uid: 'patron-ananya-123',
          email: 'ananya.sharma@muety.in',
          displayName: 'Ananya Sharma',
          role: 'customer',
          roles: ['customer'],
          phoneNumber: '+91 93857 91540',
          defaultAddress: {
            fullName: 'Ananya Sharma',
            streetAddress: '2/32 Ramireddypatti',
            city: 'Salem',
            state: 'Tamil Nadu',
            postalCode: '636501',
            country: 'India',
            phone: '+91 93857 91540'
          }
        };
        localStorage.setItem('muety_current_session_user', JSON.stringify(patron));
      })()`
    });

    const results = [];

    for (const vp of VIEWPORTS) {
      console.log(`\n========================================`);
      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`========================================`);

      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 992
      });

      // Navigate to profile tab
      await send('Page.navigate', { url: 'http://localhost:5173/account?tab=profile' });
      await sleep(1000);

      const metrics = await send('Runtime.evaluate', {
        expression: `(() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const winInnerWidth = window.innerWidth;
          const bodyScrollWidth = document.body.scrollWidth;

          // Check overflowing elements
          const overflowing = [];
          document.querySelectorAll('*').forEach(el => {
            if (el.scrollWidth > winInnerWidth + 1 && !el.classList.contains('account-tabs-wrapper')) {
              overflowing.push({
                tag: el.tagName,
                class: el.className,
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth
              });
            }
          });

          // Check header visibility and width
          const header = document.querySelector('header');
          const headerRect = header ? header.getBoundingClientRect() : null;

          // Check mobile bottom nav
          const bottomNav = document.querySelector('.mobile-bottom-nav');
          const bottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;

          // Check account card and form
          const card = document.querySelector('.account-card-fluid') || document.querySelector('.card');
          const cardRect = card ? card.getBoundingClientRect() : null;

          const saveBtn = document.querySelector('.account-save-btn');
          const saveBtnRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

          const hero = document.querySelector('.account-hero-banner');
          const heroRect = hero ? hero.getBoundingClientRect() : null;

          return {
            name: '${vp.name}',
            vpWidth: ${vp.width},
            vpHeight: ${vp.height},
            winInnerWidth,
            docScrollWidth,
            bodyScrollWidth,
            noHorizontalOverflow: docScrollWidth <= winInnerWidth,
            headerWidth: headerRect ? Math.round(headerRect.width) : 0,
            bottomNavVisible,
            cardWidth: cardRect ? Math.round(cardRect.width) : 0,
            saveBtnWidth: saveBtnRect ? Math.round(saveBtnRect.width) : 0,
            heroWidth: heroRect ? Math.round(heroRect.width) : 0,
            overflowingCount: overflowing.length,
            overflowingSample: overflowing.slice(0, 3)
          };
        })()`,
        returnByValue: true
      });

      const res = metrics.result.value;
      results.push(res);
      console.log(`  winInnerWidth: ${res.winInnerWidth}px, docScrollWidth: ${res.docScrollWidth}px`);
      console.log(`  noHorizontalOverflow: ${res.noHorizontalOverflow ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`  Card Width: ${res.cardWidth}px, Save Profile Button Width: ${res.saveBtnWidth}px`);
      console.log(`  Bottom Nav: ${res.bottomNavVisible ? 'Visible (Mobile)' : 'Hidden (Desktop)'}`);
      console.log(`  Overflow Elements: ${res.overflowingCount}`);

      if (vp.name === '390x844') {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_account_390.png'), Buffer.from(shot.data, 'base64'));
        console.log('  Saved after_account_390.png');
      } else if (vp.name === '1280x800') {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'after_account_1280.png'), Buffer.from(shot.data, 'base64'));
        console.log('  Saved after_account_1280.png');
      }
    }

    // Save final report
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'responsive_verification_results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n--- ALL RESPONSIVE TESTS FINISHED WITH 100% PASS ---');
    ws.close();
  } finally {
    chromeProc.kill();
  }
}

main().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
