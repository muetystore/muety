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
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
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
  
  // Wait until root has children
  for (let i = 0; i < 30; i++) {
    const ready = await send('Runtime.evaluate', {
      expression: 'document.querySelector("#root")?.children?.length > 0'
    });
    if (ready.result.value) break;
    await sleep(200);
  }

  await sleep(500);

  const diag = await send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const header = document.querySelector('.header-container');
      const headerRect = header ? header.getBoundingClientRect() : null;
      const logo = document.querySelector('.header-logo-mobile')?.getBoundingClientRect();
      const actions = document.querySelector('.header-actions')?.getBoundingClientRect();
      const actionItems = Array.from(document.querySelectorAll('.header-actions > *')).map(el => ({
        tag: el.tagName,
        class: el.className,
        rect: el.getBoundingClientRect(),
        display: window.getComputedStyle(el).display,
        visible: el.offsetParent !== null
      }));
      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > winInnerWidth + 1 && !el.classList.contains('account-tabs-wrapper')) {
          overflowing.push({ tag: el.tagName, class: el.className, scrollWidth: el.scrollWidth });
        }
      });
      return {
        docScrollWidth,
        winInnerWidth,
        headerRect,
        logo,
        actions,
        actionItems,
        overflowing
      };
    })())`,
    returnByValue: true
  });

  console.log(JSON.parse(diag.result.value));
  ws.close();
  chrome.kill();
}

run().catch(err => {
  console.error(err);
  chrome.kill();
});
