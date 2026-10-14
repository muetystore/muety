import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
          return data[0].webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('Failed to connect to Chrome remote debugging port.');
}

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=425,506',
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

    // 1. Set viewport to 425x506
    await send('Emulation.setDeviceMetricsOverride', {
      width: 425,
      height: 506,
      deviceScaleFactor: 1,
      mobile: true
    });

    // 2. Navigate to localhost:5173/account
    await send('Page.navigate', { url: 'http://localhost:5173/account' });
    await sleep(1500);

    // 3. Inject mock patron login in localStorage to test logged-in account page
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('muety_current_user_v1', JSON.stringify({
          uid: 'patron-test-123',
          email: 'ananya.sharma@muety.in',
          displayName: 'Ananya Sharma',
          role: 'customer',
          phoneNumber: '+91 98765 43210'
        }));
        window.location.reload();
      `
    });
    await sleep(1500);

    // 4. Measure widths and identify overflowing elements
    const diag = await send('Runtime.evaluate', {
      expression: `(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;

        // Check header width
        const header = document.querySelector('header');
        const headerRect = header ? header.getBoundingClientRect() : null;
        const headerScrollWidth = header ? header.scrollWidth : null;

        // Check desktop nav visibility and width
        const desktopNav = document.querySelector('.desktop-nav');
        const desktopNavDisplay = desktopNav ? window.getComputedStyle(desktopNav).display : null;
        const desktopNavWidth = desktopNav ? desktopNav.getBoundingClientRect().width : null;

        // Check mobile menu btn
        const mobileBtn = document.querySelector('.mobile-menu-btn');
        const mobileBtnDisplay = mobileBtn ? window.getComputedStyle(mobileBtn).display : null;

        // Check announcement bar
        const annBar = document.querySelector('.announcement-bar-top');
        const annScrollWidth = annBar ? annBar.scrollWidth : null;

        // Check account container & card
        const accountContainers = document.querySelectorAll('.account-page .container');
        const containerMetrics = Array.from(accountContainers).map(c => ({
          computedWidth: window.getComputedStyle(c).width,
          paddingLeft: window.getComputedStyle(c).paddingLeft,
          paddingRight: window.getComputedStyle(c).paddingRight,
          rectWidth: c.getBoundingClientRect().width
        }));

        const cards = document.querySelectorAll('.card');
        const cardMetrics = Array.from(cards).map(cd => ({
          computedWidth: window.getComputedStyle(cd).width,
          rectWidth: cd.getBoundingClientRect().width,
          paddingLeft: window.getComputedStyle(cd).paddingLeft,
          paddingRight: window.getComputedStyle(cd).paddingRight,
          maxWidth: window.getComputedStyle(cd).maxWidth
        }));

        // Find all elements wider than window.innerWidth
        const allElements = document.querySelectorAll('*');
        const overflowing = [];
        allElements.forEach(el => {
          if (el.scrollWidth > winInnerWidth + 2) {
            overflowing.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth
            });
          }
        });

        return {
          winInnerWidth,
          docScrollWidth,
          bodyScrollWidth,
          headerRect,
          headerScrollWidth,
          desktopNavDisplay,
          desktopNavWidth,
          mobileBtnDisplay,
          annScrollWidth,
          containerMetrics,
          cardMetrics,
          overflowing: overflowing.slice(0, 15)
        };
      })()`,
      returnByValue: true
    });

    console.log('--- DIAGNOSTIC RESULTS AT 425x506 ---');
    console.log(JSON.stringify(diag.result.value, null, 2));

    // 5. Capture screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const fs = await import('fs');
    fs.writeFileSync('C:\\Users\\Chandru\\.gemini\\antigravity-ide\\brain\\c29c3df4-5b09-4b29-8f4a-1c8141a956e9\\account_425x506_loggedin.png', buffer);
    console.log('Screenshot written to account_425x506_loggedin.png');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(console.error);
