const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

// Load .env environment variables manually without external dependencies
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const eqIdx = line.indexOf('=');
          if (eqIdx > 0) {
            const key = line.substring(0, eqIdx).trim();
            const val = line.substring(eqIdx + 1).trim();
            if (key && !(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('Failed to load .env file:', err.message);
  }
}

loadEnv();

// Centralized Official Launch Configuration (Single Source of Truth)
const LAUNCH_DATE_ISO = process.env.LAUNCH_DATE || '2026-10-18T08:00:00+05:30';

function getLaunchState() {
  const mode = (process.env.MUETY_LAUNCH_MODE || 'production').toLowerCase();
  const launchTimestamp = new Date(LAUNCH_DATE_ISO).getTime();
  const now = Date.now();

  let status = 'PRE_LAUNCH';
  if (mode === 'preview' || mode === 'force_live' || mode === 'live') {
    status = 'LIVE';
  } else if (mode === 'force_prelaunch' || mode === 'pre_launch') {
    status = 'PRE_LAUNCH';
  } else {
    status = now >= launchTimestamp ? 'LIVE' : 'PRE_LAUNCH';
  }

  return {
    status,
    launchAt: LAUNCH_DATE_ISO,
    launchTimestamp,
    serverTime: new Date(now).toISOString(),
    serverTimestamp: now,
    timeRemainingMs: Math.max(0, launchTimestamp - now),
    storeUrl: process.env.MUETY_STORE_URL || '',
    mode
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Helper: Forward request to Google Apps Script Web App with redirect handling
function sendToGoogleAppsScript(webhookUrl, email) {
  return new Promise((resolve, reject) => {
    function makePostRequest(targetUrl, postData, redirectCount = 0) {
      if (redirectCount > 5) {
        return resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
      }

      let parsedUrl;
      try { parsedUrl = new URL(targetUrl); } catch(e) { return reject(e); }

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        family: 4
      };

      const req = https.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return makeGetRequest(redirectUrl, resolve, reject, redirectCount + 1);
        }

        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === 'already_subscribed') return resolve({ success: false, status: 'already_subscribed', message: parsed.message || "You're already subscribed!" });
            if (parsed.status === 'invalid_email') return resolve({ success: false, status: 'invalid_email', message: parsed.message || "Please enter a valid email address." });
            return resolve({ success: true, status: 'subscribed', message: parsed.message || "You're subscribed! Thank you for joining Muety." });
          } catch (e) {
            resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
          }
        });
      });

      req.on('error', (err) => {
        console.error('HTTPS POST request error:', err);
        resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
      });

      req.write(postData);
      req.end();
    }

    function makeGetRequest(targetUrl, resolve, reject, redirectCount = 0) {
      if (redirectCount > 5) {
        return resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
      }

      let parsedUrl;
      try { parsedUrl = new URL(targetUrl); } catch(e) { return reject(e); }

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        family: 4
      };

      https.get(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return makeGetRequest(redirectUrl, resolve, reject, redirectCount + 1);
        }

        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === 'already_subscribed') return resolve({ success: false, status: 'already_subscribed', message: parsed.message || "You're already subscribed!" });
            if (parsed.status === 'invalid_email') return resolve({ success: false, status: 'invalid_email', message: parsed.message || "Please enter a valid email address." });
            return resolve({ success: true, status: 'subscribed', message: parsed.message || "You're subscribed! Thank you for joining Muety." });
          } catch (e) {
            resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
          }
        });
      }).on('error', (err) => {
        console.error('HTTPS GET redirect error:', err);
        resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
      });
    }

    const payload = JSON.stringify({ email });
    makePostRequest(webhookUrl, payload);
  });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // Enable CORS for local file:// testing and cross-origin access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Route: GET /api/launch-status
  if (req.method === 'GET' && reqPath === '/api/launch-status') {
    const launchState = getLaunchState();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(launchState));
  }

  // Route: POST /api/newsletter/subscribe
  if (req.method === 'POST' && reqPath === '/api/newsletter/subscribe') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        let parsedData = {};
        try { parsedData = JSON.parse(body || '{}'); } catch(e) {}
        const rawEmail = parsedData.email || '';

        // Server-side Validation
        if (!rawEmail || !rawEmail.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            status: 'invalid_email',
            message: 'Please enter your email address.'
          }));
        }

        const email = rawEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            status: 'invalid_email',
            message: 'Please enter a valid email address.'
          }));
        }

        const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
        if (!webhookUrl) {
          console.error('GOOGLE_SHEETS_WEBHOOK_URL environment variable is missing.');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            status: 'server_error',
            message: 'Something went wrong. Please try again.'
          }));
        }

        const result = await sendToGoogleAppsScript(webhookUrl, email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));

      } catch (err) {
        console.error('Error handling newsletter subscription:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          status: 'server_error',
          message: 'Something went wrong. Please try again.'
        }));
      }
    });
    return;
  }

  // Store Route Protection (Pre-launch store access prevention)
  const currentLaunchState = getLaunchState();
  if (currentLaunchState.status === 'PRE_LAUNCH') {
    if (reqPath === '/store' || reqPath.startsWith('/store/')) {
      res.writeHead(302, { 'Location': '/' });
      return res.end();
    }
  }

  // Server-side Homepage Gating
  if (reqPath === '/' || reqPath === '/index.html') {
    if (currentLaunchState.status === 'LIVE') {
      if (currentLaunchState.storeUrl && currentLaunchState.storeUrl !== '/') {
        res.writeHead(302, { 'Location': currentLaunchState.storeUrl });
        return res.end();
      }
      
      const parentDistPath = path.join(__dirname, '..', 'dist', 'index.html');
      if (fs.existsSync(parentDistPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        return fs.createReadStream(parentDistPath).pipe(res);
      }
    }
    reqPath = '/index.html';
  }

  // Friendly Legal Route Mappings
  if (reqPath === '/terms-and-conditions') reqPath = '/terms-and-conditions.html';
  if (reqPath === '/privacy-policy') reqPath = '/privacy-policy.html';

  let filePath = path.join(__dirname, reqPath);

  // If live and file not found in Countown directory, try parent dist directory (store assets)
  if (!fs.existsSync(filePath) && currentLaunchState.status === 'LIVE') {
    const distFilePath = path.join(__dirname, '..', 'dist', reqPath);
    if (fs.existsSync(distFilePath)) {
      filePath = distFilePath;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const state = getLaunchState();
  console.log(`Muety Launch Server running at http://localhost:${PORT}/`);
  console.log(`[LAUNCH GATE STATE] Status: ${state.status} | Target: ${state.launchAt} IST | Mode: ${state.mode}`);
});

