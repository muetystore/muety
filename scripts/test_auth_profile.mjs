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

  await send('Emulation.setDeviceMetricsOverride', {
    width: 425,
    height: 506,
    deviceScaleFactor: 1,
    mobile: true
  });

  // Navigate to app first so origin is localhost:5173
  await send('Page.navigate', { url: 'http://localhost:5173/account' });
  await sleep(1500);

  // Set user profile in localStorage AND call authService.login or dispatch storage event
  const loginEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const user = {
        uid: 'patron-ananya-123',
        email: 'ananya.sharma@muety.in',
        displayName: 'Ananya Sharma',
        role: 'customer',
        roles: ['customer'],
        phoneNumber: '+91 93857 91540'
      };
      localStorage.setItem('muety_current_session_user', JSON.stringify(user));
      return localStorage.getItem('muety_current_session_user');
    })()`
  });
  console.log('LocalStorage set:', loginEval.result.value);

  // Hard reload page
  await send('Page.reload');
  await sleep(1500);

  // Navigate to profile tab
  await send('Page.navigate', { url: 'http://localhost:5173/account?tab=profile' });
  await sleep(1000);

  const profileDiag = await send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const hero = document.querySelector('.account-hero-banner');
      const tabs = Array.from(document.querySelectorAll('.account-tab-btn')).map(t => ({ text: t.textContent.trim(), active: t.classList.contains('active') }));
      const form = document.querySelector('form');
      const inputs = Array.from(document.querySelectorAll('form input')).map(inp => ({ type: inp.type, value: inp.value, width: inp.getBoundingClientRect().width }));
      const saveBtn = document.querySelector('.account-save-btn');
      const saveBtnRect = saveBtn ? saveBtn.getBoundingClientRect() : null;
      const card = document.querySelector('.account-card-fluid') || document.querySelector('.card');
      const cardRect = card ? card.getBoundingClientRect() : null;
      return {
        isAuthenticatedHero: hero ? hero.textContent.slice(0, 50) : null,
        tabs,
        inputs,
        saveBtnRect,
        cardRect,
        winInnerWidth: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth
      };
    })())`,
    returnByValue: true
  });

  console.log('Profile tab diagnostic:', JSON.parse(profileDiag.result.value));

  // Take screenshot of authenticated profile page at 425x506
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('fs');
  fs.writeFileSync('C:\\Users\\Chandru\\.gemini\\antigravity-ide\\brain\\c29c3df4-5b09-4b29-8f4a-1c8141a956e9\\after_account_425_loggedin.png', Buffer.from(shot.data, 'base64'));
  console.log('Wrote after_account_425_loggedin.png!');

  ws.close();
  chrome.kill();
}

run().catch(err => {
  console.error(err);
  chrome.kill();
});
