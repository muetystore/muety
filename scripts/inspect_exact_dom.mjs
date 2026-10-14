import { spawn } from 'child_process';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
], { stdio: 'ignore' });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await sleep(1000);
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const list = await res.json();
  const pageTarget = list.find(t => t.type === 'page');
  if (!pageTarget) throw new Error('No page target found!');

  console.log('Connecting to page target:', pageTarget.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p) => new Promise((resolve, reject) => {
    const i = id++;
    const h = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === i) {
        ws.removeEventListener('message', h);
        if (d.error) reject(d.error);
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 425,
    height: 506,
    deviceScaleFactor: 1,
    mobile: true
  });

  await send('Page.navigate', { url: 'http://localhost:5173/account' });
  await sleep(2000);

  const diag = await send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const winInnerWidth = window.innerWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;

      const header = document.querySelector('header');
      const headerContainer = document.querySelector('.header-container');

      const elements = [];
      if (headerContainer) {
        Array.from(headerContainer.children).forEach(ch => {
          elements.push({
            tag: ch.tagName,
            class: ch.className,
            display: window.getComputedStyle(ch).display,
            width: ch.getBoundingClientRect().width,
            rect: ch.getBoundingClientRect()
          });
        });
      }

      const actions = document.querySelector('.header-actions');
      const actionItems = [];
      if (actions) {
        Array.from(actions.children).forEach(ch => {
          actionItems.push({
            tag: ch.tagName,
            class: ch.className,
            display: window.getComputedStyle(ch).display,
            rect: ch.getBoundingClientRect()
          });
        });
      }

      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > winInnerWidth + 1 && !el.classList.contains('account-tabs-wrapper')) {
          overflowing.push({
            tag: el.tagName,
            class: el.className,
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
        headerContainerRect: headerContainer ? headerContainer.getBoundingClientRect() : null,
        headerChildren: elements,
        actionItems,
        overflowing
      };
    })())`,
    returnByValue: true
  });

  console.log('--- EXACT DOM INSPECTION AT 425x506 ---');
  console.log(JSON.stringify(JSON.parse(diag.result.value), null, 2));

  // Also capture screenshot with Emulation active
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('fs');
  fs.writeFileSync('C:\\Users\\Chandru\\.gemini\\antigravity-ide\\brain\\c29c3df4-5b09-4b29-8f4a-1c8141a956e9\\after_account_425.png', Buffer.from(shot.data, 'base64'));
  console.log('Wrote after_account_425.png with full device metrics emulation!');

  ws.close();
  chrome.kill();
}

run().catch(err => {
  console.error(err);
  chrome.kill();
});
