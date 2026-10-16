# Muety Newsletter — Google Sheets Setup Guide

This guide walks you through setting up the **Google Sheets** backend and **Google Apps Script Web App** to store newsletter subscriptions from the Muety Launch website securely.

---

## Architecture Overview

```
[ User Browser ]
       │
       ▼ (POST /api/newsletter/subscribe)
[ server.js (Node.js Backend) ]
       │
       ▼ (Reads GOOGLE_SHEETS_WEBHOOK_URL from .env)
[ Google Apps Script Web App ]
       │
       ▼
[ Google Sheet: "Muety Newsletter Subscribers" ]
```

---

## Step-by-Step Setup Instructions

### Step 1: Create the Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a **Blank Spreadsheet**.
2. Rename the spreadsheet to: **`Muety Newsletter Subscribers`**.
3. Rename the bottom sheet/tab to: **`Subscribers`**.
4. In the first row (`Row 1`), add the following 4 headers in columns A, B, C, D:

| Column A | Column B | Column C | Column D |
| :--- | :--- | :--- | :--- |
| **ID** | **Email** | **Subscribed At** | **Status** |

---

### Step 2: Open Google Apps Script
1. In your Google Sheet, click **Extensions** in the top menu bar.
2. Select **Apps Script**.
3. Clear any existing code in the editor and rename the project to **`Muety Newsletter Backend`**.

---

### Step 3: Paste the Apps Script Code
Copy and paste the exact Google Apps Script code below into `Code.gs`:

```javascript
/**
 * MUETY NEWSLETTER BACKEND — GOOGLE APPS SCRIPT WEB APP
 * Receives subscription requests, normalizes emails, checks for duplicates,
 * and appends new subscribers to the "Subscribers" sheet tab.
 */

function doPost(e) {
  try {
    var email = '';
    
    // Parse email from JSON payload or URL parameter
    if (e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        email = parsed.email || '';
      } catch (err) {
        email = e.parameter ? (e.parameter.email || '') : '';
      }
    } else if (e && e.parameter && e.parameter.email) {
      email = e.parameter.email;
    }

    // 1. Validate email input
    if (!email || typeof email !== 'string' || !email.trim()) {
      return responseJSON({
        success: false,
        status: 'invalid_email',
        message: 'Please enter your email address.'
      });
    }

    // 2. Normalize email (trim whitespace + lowercase)
    email = email.trim().toLowerCase();
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return responseJSON({
        success: false,
        status: 'invalid_email',
        message: 'Please enter a valid email address.'
      });
    }

    // 3. Connect to Spreadsheet & Sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Subscribers');
    if (!sheet) {
      sheet = ss.insertSheet('Subscribers');
      sheet.appendRow(['ID', 'Email', 'Subscribed At', 'Status']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    // 4. Duplicate Check
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowEmail = (data[i][1] || '').toString().trim().toLowerCase();
      if (rowEmail === email) {
        return responseJSON({
          success: false,
          status: 'already_subscribed',
          message: "You're already subscribed!"
        });
      }
    }

    // 5. Append New Subscriber Record
    var newId = data.length > 1 ? (data.length) : 1;
    var nowFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var status = 'subscribed';

    sheet.appendRow([newId, email, nowFormatted, status]);

    return responseJSON({
      success: true,
      status: 'subscribed',
      message: "You're subscribed! Thank you for joining Muety."
    });

  } catch (error) {
    return responseJSON({
      success: false,
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
}

function doGet(e) {
  return responseJSON({
    status: 'ok',
    message: 'Muety Newsletter Google Apps Script Web App is active.'
  });
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

### Step 4: Deploy as a Web App
1. Click **Deploy** (top right) ➔ **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure settings:
   - **Description**: `Muety Newsletter API`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: **`Anyone`** *(Crucial for server.js to communicate without login screens)*
4. Click **Deploy**.
5. Grant permissions if prompted by Google (click *Advanced* ➔ *Go to Muety Newsletter Backend (unsafe)* ➔ *Allow*).
6. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 5: Configure `.env` in Your Muety Project
1. In the project root directory, open or create the `.env` file.
2. Set the `GOOGLE_SHEETS_WEBHOOK_URL` variable with your copied Web App URL:

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

3. Ensure `.env` is listed in your `.gitignore` file (already configured).

---

### Step 6: Start/Restart the Muety Node Server
Restart your Node server to load the environment variable:

```bash
node server.js
```

---

## Verification Checklist

- [x] Submitting an empty email displays: `Please enter your email address.`
- [x] Submitting `invalid-email` displays: `Please enter a valid email address.`
- [x] Submitting `customer@gmail.com` displays: `You're subscribed! Thank you for joining Muety.`
- [x] Checking your Google Sheet tab **`Subscribers`** shows:
  ```
  1 | customer@gmail.com | 2026-10-04 17:00:00 | subscribed
  ```
- [x] Submitting `customer@gmail.com` again displays: `You're already subscribed!`
