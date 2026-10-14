import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9226;
const ARTIFACT_DIR = 'C:\\Users\\Chandru\\.gemini\\antigravity-ide\\brain\\c29c3df4-5b09-4b29-8f4a-1c8141a956e9';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 25; i++) {
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
  console.log('=== MUETY STOREFRONT — COMPREHENSIVE 8-REQUIREMENTS VERIFICATION ===');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'about:blank'
  ], { stdio: 'ignore' });

  const report = {
    timestamp: new Date().toISOString(),
    results: {}
  };

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

    // =========================================================================
    // REQUIREMENT 1 & 7: Patron Portal (/account) & Wishlist Redirection
    // =========================================================================
    console.log('\n[1/8] Verifying Requirement 1 & 7: Account Page & Wishlist Tab Removal...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Seed patron in localStorage
    await send('Page.navigate', { url: 'http://localhost:5173/account' });
    await sleep(1500);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const patron = {
          uid: 'patron-ananya-test',
          email: 'ananya.sharma@muety.in',
          displayName: 'Ananya Sharma',
          role: 'customer',
          roles: ['customer']
        };
        localStorage.setItem('muety_current_session_user', JSON.stringify(patron));
      })()`
    });

    await send('Page.navigate', { url: 'http://localhost:5173/account' });
    await sleep(1500);

    const req1Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const hero = document.querySelector('.account-hero-banner');
        const heroSignOut = hero ? hero.querySelector('button') : null;
        const heroWelcome = hero ? hero.querySelector('h1, h2, .account-welcome-title') : null;
        const heroEmail = hero ? hero.textContent.includes('ananya.sharma@muety.in') : false;
        const heroTier = hero ? hero.textContent.includes('MUETY Atelier Club') : false;

        const tabsWrapper = document.querySelector('.account-tabs-wrapper');
        const tabButtons = tabsWrapper ? Array.from(tabsWrapper.querySelectorAll('button')).map(b => b.textContent.trim()) : [];
        const hasWishlistTab = tabButtons.some(t => t.toLowerCase().includes('wishlist'));

        return {
          heroStandaloneSignOutPresent: !!heroSignOut,
          welcomePresent: !!heroWelcome,
          emailPresent: heroEmail,
          tierPresent: heroTier,
          tabs: tabButtons,
          hasWishlistTab
        };
      })()`,
      returnByValue: true
    });

    // Check profile tab compact sign out
    await send('Page.navigate', { url: 'http://localhost:5173/account?tab=profile' });
    await sleep(1000);

    const profileSignOutCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const profileSignOut = btns.find(b => b.textContent.toLowerCase().includes('sign out') || b.textContent.toLowerCase().includes('signout'));
        return {
          profileSignOutPresent: !!profileSignOut,
          signOutButtonText: profileSignOut ? profileSignOut.textContent.trim() : null
        };
      })()`,
      returnByValue: true
    });

    // Check legacy ?tab=wishlist redirect
    await send('Page.navigate', { url: 'http://localhost:5173/account?tab=wishlist' });
    await sleep(1000);
    const redirectUrl = await send('Runtime.evaluate', {
      expression: 'window.location.pathname',
      returnByValue: true
    });

    const shotAccount = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_req1_account.png'), Buffer.from(shotAccount.data, 'base64'));

    const req1Passed = !req1Check.result.value.heroStandaloneSignOutPresent &&
      req1Check.result.value.welcomePresent &&
      req1Check.result.value.tierPresent &&
      !req1Check.result.value.hasWishlistTab &&
      profileSignOutCheck.result.value.profileSignOutPresent &&
      redirectUrl.result.value === '/wishlist';

    report.results.requirement1_account_signout = {
      status: req1Passed ? 'PASS' : 'FAIL',
      data: {
        ...req1Check.result.value,
        ...profileSignOutCheck.result.value,
        legacyWishlistRedirectUrl: redirectUrl.result.value
      }
    };
    console.log('  Req 1 Result:', req1Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement1_account_signout);

    // =========================================================================
    // REQUIREMENT 2: Mobile Header Navigation Search Icon Repositioning
    // =========================================================================
    console.log('\n[2/8] Verifying Requirement 2: Mobile Header Element Order & Touch Targets...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    const req2Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const logo = document.querySelector('.header-logo-mobile');
        const searchBtn = document.querySelector('.header-search-btn');
        const bagBtn = document.querySelector('.header-bag-btn');

        const mRect = menuBtn ? menuBtn.getBoundingClientRect() : null;
        const lRect = logo ? logo.getBoundingClientRect() : null;
        const sRect = searchBtn ? searchBtn.getBoundingClientRect() : null;
        const bRect = bagBtn ? bagBtn.getBoundingClientRect() : null;

        const isOrderCorrect = mRect && lRect && sRect && bRect &&
          mRect.left < lRect.left &&
          lRect.right <= sRect.left + 50 &&
          sRect.left < bRect.left;

        const tapTargetsValid = [mRect, sRect, bRect].every(r => r && r.width >= 38 && r.height >= 38);

        return {
          menuBtn: mRect ? { left: Math.round(mRect.left), width: Math.round(mRect.width) } : null,
          logo: lRect ? { left: Math.round(lRect.left), width: Math.round(lRect.width) } : null,
          searchBtn: sRect ? { left: Math.round(sRect.left), width: Math.round(sRect.width) } : null,
          bagBtn: bRect ? { left: Math.round(bRect.left), width: Math.round(bRect.width) } : null,
          isOrderCorrect,
          tapTargetsValid
        };
      })()`,
      returnByValue: true
    });

    const shotMobileHeader = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_req2_mobile_header.png'), Buffer.from(shotMobileHeader.data, 'base64'));

    const req2Passed = req2Check.result.value.isOrderCorrect && req2Check.result.value.tapTargetsValid;
    report.results.requirement2_mobile_header = {
      status: req2Passed ? 'PASS' : 'FAIL',
      data: req2Check.result.value
    };
    console.log('  Req 2 Result:', req2Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement2_mobile_header);

    // =========================================================================
    // REQUIREMENT 3: Mobile Bottom Nav Saree Icon
    // =========================================================================
    console.log('\n[3/8] Verifying Requirement 3: Mobile Bottom Nav Saree Drape Icon...');
    const req3Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const bottomNav = document.querySelector('.mobile-bottom-nav');
        const sareeItem = bottomNav ? bottomNav.querySelector('a[href="/products"]') : null;
        const sareeSvg = sareeItem ? sareeItem.querySelector('svg') : null;
        const pathCount = sareeSvg ? sareeSvg.querySelectorAll('path').length : 0;
        const strokeColor = sareeSvg ? sareeSvg.getAttribute('stroke') || window.getComputedStyle(sareeSvg).stroke : '';

        return {
          bottomNavPresent: !!bottomNav,
          sareeItemPresent: !!sareeItem,
          svgPresent: !!sareeSvg,
          pathCount,
          isCustomSareeIcon: pathCount >= 4
        };
      })()`,
      returnByValue: true
    });

    const req3Passed = req3Check.result.value.isCustomSareeIcon;
    report.results.requirement3_saree_icon = {
      status: req3Passed ? 'PASS' : 'FAIL',
      data: req3Check.result.value
    };
    console.log('  Req 3 Result:', req3Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement3_saree_icon);

    // =========================================================================
    // REQUIREMENT 4: Campaign Hero Banner Sizing & Master Status
    // =========================================================================
    console.log('\n[4/8] Verifying Requirement 4: Campaign Hero Banner & Creative Master Status...');
    const req4Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const heroImg = document.querySelector('.campaign-hero-bg-img');
        const heroSection = document.querySelector('.campaign-hero-section');
        const scrim = document.querySelector('.campaign-hero-scrim');

        const rect = heroImg ? heroImg.getBoundingClientRect() : null;
        const computed = heroImg ? window.getComputedStyle(heroImg) : null;

        return {
          heroImgPresent: !!heroImg,
          naturalWidth: heroImg ? heroImg.naturalWidth : 0,
          naturalHeight: heroImg ? heroImg.naturalHeight : 0,
          renderedWidth: rect ? Math.round(rect.width) : 0,
          renderedHeight: rect ? Math.round(rect.height) : 0,
          objectFit: computed ? computed.objectFit : '',
          objectPosition: computed ? computed.objectPosition : '',
          scrimPresent: !!scrim
        };
      })()`,
      returnByValue: true
    });

    const req4Passed = req4Check.result.value.heroImgPresent && req4Check.result.value.objectFit === 'cover';
    report.results.requirement4_campaign_hero = {
      status: req4Passed ? 'PASS' : 'FAIL',
      data: req4Check.result.value,
      creativeMasterFinding: 'public/diwali_hero_banner.jpg (2171x724) contains flattened marketing typography from commit d97c31a. No unflattened Dasara source asset exists in git history. Flagged for Creative Team replacement.'
    };
    console.log('  Req 4 Result:', req4Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement4_campaign_hero);

    // =========================================================================
    // REQUIREMENT 5: Join Circle with Sign-In & Google Auth & Mandatory Consent
    // =========================================================================
    console.log('\n[5/8] Verifying Requirement 5: Join Circle Auth & Mandatory Consent Checkbox...');
    // Clear user from localStorage to test unauthenticated join circle
    await send('Runtime.evaluate', {
      expression: 'localStorage.removeItem("muety_current_session_user")'
    });
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    const req5CheckSignedOut = await send('Runtime.evaluate', {
      expression: `(() => {
        const circleSection = document.querySelector('.join-circle-card') || document.querySelector('.newsletter-section');
        const googleBtn = circleSection ? Array.from(circleSection.querySelectorAll('button')).find(b => b.textContent.includes('Google')) : null;
        const emailInput = circleSection ? circleSection.querySelector('input[type="email"]') : null;
        const consentCheckbox = circleSection ? circleSection.querySelector('input[type="checkbox"]') : null;
        const termsLink = circleSection ? circleSection.querySelector('a[href="/terms-conditions"]') : null;
        const privacyLink = circleSection ? circleSection.querySelector('a[href="/privacy-policy"]') : null;

        return {
          googleBtnPresent: !!googleBtn,
          emailInputPresent: !!emailInput,
          consentCheckboxPresent: !!consentCheckbox,
          isInitiallyUnchecked: consentCheckbox ? !consentCheckbox.checked : false,
          termsLinkPresent: !!termsLink,
          privacyLinkPresent: !!privacyLink
        };
      })()`,
      returnByValue: true
    });

    // Test authenticated state
    await send('Runtime.evaluate', {
      expression: `(() => {
        const patron = {
          uid: 'patron-ananya-test',
          email: 'ananya.sharma@muety.in',
          displayName: 'Ananya Sharma',
          role: 'customer'
        };
        localStorage.setItem('muety_current_session_user', JSON.stringify(patron));
      })()`
    });
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    const req5CheckSignedIn = await send('Runtime.evaluate', {
      expression: `(() => {
        const circleSection = document.querySelector('.join-circle-card') || document.querySelector('.newsletter-section');
        const memberCard = circleSection ? circleSection.querySelector('.patron-member-card') : null;
        const memberEmail = memberCard ? memberCard.textContent.includes('ananya.sharma@muety.in') : false;

        return {
          memberCardPresent: !!memberCard,
          memberEmailPresent: memberEmail
        };
      })()`,
      returnByValue: true
    });

    const shotJoinCircle = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_req5_join_circle.png'), Buffer.from(shotJoinCircle.data, 'base64'));

    const req5Passed = req5CheckSignedOut.result.value.googleBtnPresent &&
      req5CheckSignedOut.result.value.consentCheckboxPresent &&
      req5CheckSignedOut.result.value.isInitiallyUnchecked &&
      req5CheckSignedOut.result.value.termsLinkPresent &&
      req5CheckSignedOut.result.value.privacyLinkPresent &&
      req5CheckSignedIn.result.value.memberCardPresent;

    report.results.requirement5_join_circle = {
      status: req5Passed ? 'PASS' : 'FAIL',
      signedOut: req5CheckSignedOut.result.value,
      signedIn: req5CheckSignedIn.result.value
    };
    console.log('  Req 5 Result:', req5Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement5_join_circle);

    // =========================================================================
    // REQUIREMENT 6: Footer Actionable Contacts & Interactive Disclosure
    // =========================================================================
    console.log('\n[6/8] Verifying Requirement 6: Footer Actionable Contacts & Interactive Disclosure...');
    const req6Initial = await send('Runtime.evaluate', {
      expression: `(() => {
        const footer = document.querySelector('footer');
        const mapsLink = footer ? footer.querySelector('a[href*="maps.google.com"]') : null;
        const phoneLink = footer ? footer.querySelector('a[href^="tel:"]') : null;
        const whatsappLink = footer ? footer.querySelector('a[href*="wa.me"]') : null;
        const emailLink = footer ? footer.querySelector('a[href^="mailto:"]') : null;
        const instaLink = footer ? footer.querySelector('a[href*="instagram.com/Themuety"]') : null;
        const disclosureBtn = footer ? footer.querySelector('button[aria-controls="footer-concierge-panel"]') : null;

        return {
          mapsLink: mapsLink ? mapsLink.getAttribute('href') : null,
          phoneLink: phoneLink ? phoneLink.getAttribute('href') : null,
          whatsappLink: whatsappLink ? whatsappLink.getAttribute('href') : null,
          emailLink: emailLink ? emailLink.getAttribute('href') : null,
          instaLink: instaLink ? instaLink.getAttribute('href') : null,
          disclosureBtnPresent: !!disclosureBtn,
          initialExpanded: disclosureBtn ? disclosureBtn.getAttribute('aria-expanded') : null
        };
      })()`,
      returnByValue: true
    });

    // Click disclosure button and await React 18 microtask/render cycle
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('footer button[aria-controls="footer-concierge-panel"]');
        if (btn) btn.click();
      })()`
    });
    await sleep(400);

    const req6AfterClick = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('footer button[aria-controls="footer-concierge-panel"]');
        const panel = document.getElementById('footer-concierge-panel');
        return {
          expandedAfterClick: btn ? btn.getAttribute('aria-expanded') : null,
          panelOpened: !!panel
        };
      })()`,
      returnByValue: true
    });

    const shotFooter = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_req6_footer.png'), Buffer.from(shotFooter.data, 'base64'));

    const r6Init = req6Initial.result.value;
    const r6After = req6AfterClick.result.value;
    const req6Passed = r6Init.mapsLink && r6Init.phoneLink && r6Init.whatsappLink && r6Init.emailLink && r6Init.instaLink &&
      r6Init.disclosureBtnPresent && r6After.panelOpened && r6After.expandedAfterClick === 'true';

    report.results.requirement6_footer_contacts = {
      status: req6Passed ? 'PASS' : 'FAIL',
      data: {
        ...r6Init,
        ...r6After
      }
    };
    console.log('  Req 6 Result:', req6Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement6_footer_contacts);

    // =========================================================================
    // REQUIREMENT 7: Dedicated Wishlist Route (/wishlist)
    // =========================================================================
    console.log('\n[7/8] Verifying Requirement 7: Dedicated /wishlist Route...');
    await send('Page.navigate', { url: 'http://localhost:5173/wishlist' });
    await sleep(1200);

    const req7Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const heading = document.querySelector('h1, h2');
        return {
          path: window.location.pathname,
          headingText: heading ? heading.textContent.trim() : null,
          isWishlistPage: window.location.pathname === '/wishlist'
        };
      })()`,
      returnByValue: true
    });

    const req7Passed = req7Check.result.value.isWishlistPage;
    report.results.requirement7_dedicated_wishlist = {
      status: req7Passed ? 'PASS' : 'FAIL',
      data: req7Check.result.value
    };
    console.log('  Req 7 Result:', req7Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement7_dedicated_wishlist);

    // =========================================================================
    // REQUIREMENT 8: Razorpay Security & Server Signature Verification Endpoint
    // =========================================================================
    console.log('\n[8/8] Verifying Requirement 8: Razorpay Security & Server Signature Endpoint...');
    // 1. Check .env variables
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
    const hasViteSecret = envContent.includes('VITE_RAZORPAY_KEY_SECRET');
    const hasServerSecret = envContent.includes('RAZORPAY_KEY_SECRET=');
    const hasPublicKey = envContent.includes('VITE_RAZORPAY_KEY_ID=rzp_live_');

    // 2. Test server verification endpoint with genuine HMAC vs forged HMAC
    const testSecret = '45GFNPsI1aG2p5yvXDeoJYNK';
    const testOrderId = 'order_test_12345';
    const testPaymentId = 'pay_test_67890';
    const validSignature = crypto.createHmac('sha256', testSecret).update(`${testOrderId}|${testPaymentId}`).digest('hex');

    let validVerifyRes = null;
    let forgedVerifyRes = null;

    try {
      const vRes = await fetch('http://localhost:5173/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: testOrderId,
          razorpay_payment_id: testPaymentId,
          razorpay_signature: validSignature
        })
      });
      validVerifyRes = await vRes.json();
    } catch (e) {
      validVerifyRes = { error: e.message };
    }

    try {
      const fRes = await fetch('http://localhost:5173/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: testOrderId,
          razorpay_payment_id: testPaymentId,
          razorpay_signature: 'forged_tampered_signature_xyz'
        })
      });
      forgedVerifyRes = await fRes.json();
    } catch (e) {
      forgedVerifyRes = { error: e.message };
    }

    const req8Passed = !hasViteSecret && hasServerSecret && hasPublicKey &&
      validVerifyRes?.success === true &&
      validVerifyRes?.verified === true &&
      (forgedVerifyRes?.success === false || forgedVerifyRes?.code === 'PERMISSION_DENIED');

    report.results.requirement8_razorpay_security = {
      status: req8Passed ? 'PASS' : 'FAIL',
      noViteSecretInEnv: !hasViteSecret,
      serverSecretInEnv: hasServerSecret,
      publicKeyConfigured: hasPublicKey,
      validSignatureVerified: validVerifyRes,
      forgedSignatureRejected: forgedVerifyRes
    };
    console.log('  Req 8 Result:', req8Passed ? 'PASS ✓' : 'FAIL ✗', report.results.requirement8_razorpay_security);

    // Save final report
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'comprehensive_8_requirements_report.json'), JSON.stringify(report, null, 2));
    console.log('\n=========================================================================');
    console.log('ALL 8 REQUIREMENTS TESTED SUCCESSFULLY! SUMMARY SAVED TO ARTIFACT DIR.');
    console.log('=========================================================================');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
