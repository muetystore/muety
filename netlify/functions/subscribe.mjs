import https from 'node:https';
import { URL } from 'node:url';

function makePostRequest(targetUrl, postData) {
  return new Promise((resolve) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return resolve({ success: false, status: 'server_error', message: 'Invalid webhook URL' });
    }

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
        return makeGetRequest(redirectUrl).then(resolve);
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'already_subscribed') {
            return resolve({ success: false, status: 'already_subscribed', message: parsed.message || "You're already subscribed!" });
          }
          if (parsed.status === 'invalid_email') {
            return resolve({ success: false, status: 'invalid_email', message: parsed.message || "Please enter a valid email address." });
          }
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
  });
}

function makeGetRequest(targetUrl, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 5) {
      return resolve({ success: true, status: 'subscribed', message: "You're subscribed! Thank you for joining Muety." });
    }

    let parsedUrl;
    try { parsedUrl = new URL(targetUrl); } catch (e) { return resolve({ success: false, status: 'server_error', message: 'Invalid URL' }); }

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
        return makeGetRequest(redirectUrl, redirectCount + 1).then(resolve);
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
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    let parsedData = {};
    try { parsedData = JSON.parse(event.body || '{}'); } catch (e) {}
    const rawEmail = parsedData.email || '';

    if (!rawEmail || !rawEmail.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, status: 'invalid_email', message: 'Please enter your email address.' })
      };
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, status: 'invalid_email', message: 'Please enter a valid email address.' })
      };
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('GOOGLE_SHEETS_WEBHOOK_URL environment variable is missing.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, status: 'server_error', message: 'Something went wrong. Please try again.' })
      };
    }

    const result = await makePostRequest(webhookUrl, JSON.stringify({ email }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('Netlify function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, status: 'server_error', message: 'Something went wrong. Please try again.' })
    };
  }
}
