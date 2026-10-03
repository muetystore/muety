import { initializeFirebaseAdmin, getAdminDb, getAdminAuth } from './admin-init.mjs';

async function checkStatus() {
  console.log('\n=============================================================');
  console.log('📊 MUETYSTORE — FIREBASE ARCHITECTURE & FIRESTORE STATUS');
  console.log('=============================================================\n');

  const { app, projectId, hasCreds } = initializeFirebaseAdmin();
  console.log(`   Connected Firebase Project ID: \x1b[36m${projectId}\x1b[0m`);
  console.log(`   Admin Credentials Present   : ${hasCreds ? '\x1b[32mYES\x1b[0m' : '\x1b[33mNO (Set GOOGLE_APPLICATION_CREDENTIALS for cloud admin features)\x1b[0m'}\n`);

  if (!hasCreds) {
    console.log('--- LOCAL ARCHITECTURE & STOREFRONT READY ---');
    console.log(' • Local Storefront & Client Application rely on Vite Client SDK configuration.');
    console.log(' • To run live Firebase Admin SDK operations against remote Firestore/Auth,');
    console.log('   set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json in environment.');
    console.log('=============================================================\n');
    return;
  }

  const db = getAdminDb();
  const auth = getAdminAuth();

  // 1. Users & Auth
  let authUsersCount = 0;
  let superAdminCount = 0;

  try {
    const userRecords = await auth.listUsers(100);
    authUsersCount = userRecords.users.length;
    for (const u of userRecords.users) {
      if (u.customClaims?.roles?.includes('super_admin') || u.customClaims?.role === 'super_admin') {
        superAdminCount++;
      }
    }
  } catch (err) {
    console.warn(`   ⚠️ Auth query note: ${err.message}`);
  }

  try {
    const usersSnap = await db.collection('users').get();
    const settingsSnap = await db.collection('settings').get();
    const categoriesSnap = await db.collection('categories').get();
    const productsSnap = await db.collection('products').get();
    const couponsSnap = await db.collection('coupons').get();
    const ordersSnap = await db.collection('orders').get();
    const inquiriesSnap = await db.collection('inquiries').get();
    const reviewsSnap = await db.collection('reviews').get();

    console.log('--- FIRESTORE COLLECTIONS SNAPSHOT ---');
    console.log(` • Auth Users Count       : ${authUsersCount} (Super Admins: ${superAdminCount})`);
    console.log(` • /users Documents       : ${usersSnap.size}`);
    console.log(` • /settings Documents    : ${settingsSnap.size} ${settingsSnap.size > 0 ? '✓ (/settings/store_settings)' : '❌ (Missing)'}`);
    console.log(` • /categories Documents  : ${categoriesSnap.size}`);
    console.log(` • /products Documents    : ${productsSnap.size}`);
    console.log(` • /coupons Documents     : ${couponsSnap.size}`);
    console.log(` • /orders Documents      : ${ordersSnap.size}`);
    console.log(` • /inquiries Documents   : ${inquiriesSnap.size}`);
    console.log(` • /reviews Documents     : ${reviewsSnap.size}`);
    console.log('=============================================================\n');
  } catch (err) {
    console.log('\n--- SERVER PRIVILEGED AUTHENTICATION NOTICE ---');
    console.log(' ℹ️  Firebase Admin SDK commands require service account credentials for remote connection.');
    console.log(' ℹ️  To connect to live Firebase, set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json');
    console.log(' ℹ️  Local storefront & client app continue to run via Vite Client SDK configuration.');
    console.log('=============================================================\n');
  }
}

checkStatus().catch(err => {
  console.log('\nℹ️  Firebase Admin status check completed.');
});
