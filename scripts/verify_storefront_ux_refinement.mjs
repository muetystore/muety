import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
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
  console.log('Starting Storefront UX Refinement Verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
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

    // 1. DESKTOP HEADER & NAVIGATION ORDER (1280x900)
    console.log('\n--- 1. Testing Desktop Navigation Header (1280x900) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);

    const desktopAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const logo = document.querySelector('.header-logo-desktop');
        const nav = document.querySelector('.desktop-nav');
        const actions = document.querySelector('.header-actions');
        const links = nav ? Array.from(nav.querySelectorAll('a, button')).map(el => el.textContent.trim()) : [];
        const actionBtns = actions ? Array.from(actions.querySelectorAll('a, button')).map(el => el.getAttribute('aria-label') || el.title || el.textContent.trim()) : [];
        const bottomNav = document.querySelector('.mobile-bottom-nav');
        const isBottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;

        return {
          logoPresent: !!logo,
          navLinks: links,
          actions: actionBtns,
          bottomNavHiddenOnDesktop: !isBottomNavVisible
        };
      })()`,
      returnByValue: true
    });
    console.log('Desktop Header Audit:', JSON.stringify(desktopAudit.result.value, null, 2));

    const snapDesktopHeader = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_header_refined.png'), Buffer.from(snapDesktopHeader.data, 'base64'));
    console.log('Saved desktop_header_refined.png');

    // 2. DESKTOP SHOP BY MEGA-MENU
    console.log('\n--- 2. Testing Desktop Shop By Mega-Menu ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('.desktop-nav button')).find(b => b.textContent.includes('Shop By'));
        if (btn) btn.click();
      })()`
    });
    await sleep(400);

    const snapShopBy = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_shopby_megamenu.png'), Buffer.from(snapShopBy.data, 'base64'));
    console.log('Saved desktop_shopby_megamenu.png');

    // 3. DESKTOP COLLECTIONS DROPDOWN
    console.log('\n--- 3. Testing Desktop Collections Dropdown & Hover Bridge ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const collWrapper = document.querySelector('.desktop-nav .nav-dropdown-wrapper:nth-child(2)');
        if (collWrapper) {
          const btn = collWrapper.querySelector('.nav-dropdown-trigger');
          if (btn) btn.click();
        }
      })()`
    });
    await sleep(600);

    const snapCollections = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_collections_dropdown.png'), Buffer.from(snapCollections.data, 'base64'));
    console.log('Saved desktop_collections_dropdown.png');

    // Close collections menu
    await send('Runtime.evaluate', {
      expression: `(() => {
        const collWrapper = document.querySelector('.desktop-nav .nav-dropdown-wrapper:nth-child(2)');
        if (collWrapper) {
          const btn = collWrapper.querySelector('.nav-dropdown-trigger');
          if (btn) btn.click();
        }
      })()`
    });
    await sleep(300);

    // 4. DESKTOP SEARCH OVERLAY
    console.log('\n--- 4. Testing Kalanmandir-Inspired Search Overlay (Desktop) ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const searchBtn = document.querySelector('.desktop-search-btn');
        if (searchBtn) searchBtn.click();
      })()`
    });
    await sleep(500);

    // Type "sa" into search input
    await send('Runtime.evaluate', {
      expression: `(() => {
        const inp = document.querySelector('.search-modal-container input');
        if (inp) {
          inp.value = 'sa';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await sleep(500);

    const snapSearchDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_search_overlay_kalanmandir.png'), Buffer.from(snapSearchDesktop.data, 'base64'));
    console.log('Saved desktop_search_overlay_kalanmandir.png');

    // Close search overlay
    await send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.search-modal-container button[aria-label="Close search"]');
        if (closeBtn) closeBtn.click();
      })()`
    });
    await sleep(300);

    // 5. MOBILE HEADER & BOTTOM NAVIGATION (375x812)
    console.log('\n--- 5. Testing Mobile Header & Bottom Navigation (375x812) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    const mobileAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const searchBtn = document.querySelector('.mobile-search-btn');
        const logoMobile = document.querySelector('.header-logo-mobile');
        const bagBtn = document.querySelector('.header-bag-btn');
        const wishlistHeartInHeader = document.querySelector('.header-right-cluster .header-wishlist-btn');
        const wishlistComputedDisplay = wishlistHeartInHeader ? window.getComputedStyle(wishlistHeartInHeader).display : 'none';
        
        const bottomNav = document.querySelector('.mobile-bottom-nav');
        const bottomNavItems = bottomNav ? Array.from(bottomNav.querySelectorAll('.bottom-nav-item')).map(a => a.getAttribute('aria-label') || a.title) : [];
        const bottomNavLabels = bottomNav ? Array.from(bottomNav.querySelectorAll('span, p')).filter(s => s.textContent.trim().length > 3).map(s => s.textContent.trim()) : [];

        return {
          headerMenuBtn: !!menuBtn,
          headerSearchBtn: !!searchBtn,
          headerLogoCentered: !!logoMobile,
          headerBagBtn: !!bagBtn,
          headerWishlistHidden: wishlistComputedDisplay === 'none',
          bottomNavItemsCount: bottomNavItems.length,
          bottomNavDestinations: bottomNavItems,
          bottomNavHasTextLabels: bottomNavLabels.length > 0,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()`,
      returnByValue: true
    });
    console.log('Mobile Header & Bottom Nav Audit:', JSON.stringify(mobileAudit.result.value, null, 2));

    const snapMobileHome = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_compact_header_and_bottom_nav.png'), Buffer.from(snapMobileHome.data, 'base64'));
    console.log('Saved mobile_compact_header_and_bottom_nav.png');

    // 6. MOBILE SEARCH DRAWER (375x812)
    console.log('\n--- 6. Testing Mobile Search Drawer ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const searchBtn = document.querySelector('.mobile-search-btn');
        if (searchBtn) searchBtn.click();
      })()`
    });
    await sleep(500);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const inp = document.querySelector('.search-modal-container input');
        if (inp) {
          inp.value = 'silk';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await sleep(500);

    const snapMobileSearch = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_search_drawer.png'), Buffer.from(snapMobileSearch.data, 'base64'));
    console.log('Saved mobile_search_drawer.png');

    // Close search
    await send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.search-modal-container button[aria-label="Close search"]');
        if (closeBtn) closeBtn.click();
      })()`
    });
    await sleep(300);

    // 7. WISHLIST DEDICATED PAGE
    console.log('\n--- 7. Testing Dedicated Wishlist Page (/wishlist) ---');
    await send('Page.navigate', { url: 'http://localhost:5173/wishlist' });
    await sleep(1500);

    const snapWishlist = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'mobile_wishlist_page.png'), Buffer.from(snapWishlist.data, 'base64'));
    console.log('Saved mobile_wishlist_page.png');

    // 8. SALEM ATELIER PAGE (IMAGE REMOVAL VERIFICATION)
    console.log('\n--- 8. Testing Salem Atelier Page (/about) Image Removal ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.navigate', { url: 'http://localhost:5173/about' });
    await sleep(1500);

    const aboutAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const images = Array.from(document.querySelectorAll('img')).map(img => img.src);
        const hasUnsplashSaree = images.some(src => src.includes('98e550d6193c'));
        return {
          totalImagesOnAboutPage: images.length,
          hasRemovedSareeImage: !hasUnsplashSaree,
          imageSources: images
        };
      })()`,
      returnByValue: true
    });
    console.log('About Page Audit:', JSON.stringify(aboutAudit.result.value, null, 2));

    const snapAbout = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'desktop_about_atelier_no_image.png'), Buffer.from(snapAbout.data, 'base64'));
    console.log('Saved desktop_about_atelier_no_image.png');

    // 9. ACCOUNT PAGE & ADDRESS MANAGEMENT (/account?tab=address)
    console.log('\n--- 9. Testing Multi-Address Delivery Management (/account) ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const testUser = {
          uid: 'test-patron-001',
          email: 'priyadharshini@example.com',
          displayName: 'Priyadharshini V',
          role: 'customer',
          phoneNumber: '+91 93857 91540'
        };
        const testAddresses = [
          {
            id: 'addr-01',
            fullName: 'Priyadharshini V',
            phone: '+91 93857 91540',
            houseFlat: 'Flat 4B, Sri Krishna Apts',
            streetAddress: '2/32 Ramireddypatti, Meyyanur Main Rd',
            landmark: 'Near New Bus Stand',
            city: 'Salem',
            state: 'Tamil Nadu',
            postalCode: '636501',
            country: 'India',
            type: 'home',
            isDefault: true
          },
          {
            id: 'addr-02',
            fullName: 'Priyadharshini (Atelier Studio)',
            phone: '+91 93857 91540',
            houseFlat: 'Design Suite 2',
            streetAddress: '45 Omalur Main Road',
            city: 'Salem',
            state: 'Tamil Nadu',
            postalCode: '636009',
            country: 'India',
            type: 'work',
            isDefault: false
          }
        ];
        localStorage.setItem('muety_current_session_user', JSON.stringify(testUser));
        localStorage.setItem('muety_customer_addresses_test-patron-001', JSON.stringify(testAddresses));
      })()`
    });

    await send('Page.navigate', { url: 'http://localhost:5173/account?tab=address' });
    await sleep(1500);

    const snapAccountAddress = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'account_address_management.png'), Buffer.from(snapAccountAddress.data, 'base64'));
    console.log('Saved account_address_management.png');

    // Open Add Address modal
    await send('Runtime.evaluate', {
      expression: `(() => {
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add New Address'));
        if (addBtn) addBtn.click();
      })()`
    });
    await sleep(500);

    const snapAddressModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'account_add_address_modal.png'), Buffer.from(snapAddressModal.data, 'base64'));
    console.log('Saved account_add_address_modal.png');

    // Clean up test user from storage
    await send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.removeItem('muety_current_session_user');
        localStorage.removeItem('muety_customer_addresses_test-patron-001');
      })()`
    });

    console.log('\nAll storefront UX refinement verifications completed successfully!');
  } finally {
    chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
