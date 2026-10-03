import { initializeFirebaseAdmin, getAdminDb, getAdminAuth } from './admin-init.mjs';
import { runAuthSeed } from './seed-auth.mjs';
import { runFirestoreSeed } from './seed-firestore.mjs';

async function bootstrap() {
  console.log('\n=============================================================');
  console.log('🏛️  MUETYSTORE — FIREBASE AUTOMATED DATA INITIALIZATION');
  console.log('=============================================================\n');

  // Step 1: Validate Configuration & Connection
  console.log('🔍 Step 1: Validating Environment & Privileged Connection...');
  const { app, projectId, hasCreds } = initializeFirebaseAdmin();
  console.log(`   ✓ Connected to Firebase Project: \x1b[36m${projectId}\x1b[0m`);

  if (!hasCreds) {
    console.log('\n⚠️  FIREBASE ADMIN CREDENTIALS NOT CONFIGURED LOCALLY');
    console.log('   To run server-side bootstrap against remote Firebase Auth & Firestore:');
    console.log('   1. Download your Service Account JSON from Firebase Console -> Project Settings -> Service Accounts');
    console.log('   2. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json');
    console.log('   3. Re-run: npm run firebase:setup');
    console.log('\n   The client storefront & local app continue to operate normally using client Firebase SDK.');
    console.log('=============================================================\n');
    return;
  }

  // Step 2: Auth Bootstrap & Multi-Role Claims
  console.log('\n🔑 Step 2: Bootstrapping Administrator Auth & Roles...');
  const authResults = await runAuthSeed(app);

  // Step 3: Firestore Foundation & Catalog Seeding
  console.log('\n📦 Step 3: Initializing Authoritative Firestore Catalog & Settings...');
  const firestoreResults = await runFirestoreSeed(app);

  // Step 4: Summary Report
  console.log('\n=============================================================');
  console.log('🎉 FIREBASE INITIALIZATION & VERIFICATION COMPLETE');
  console.log('=============================================================');
  console.log(` • Firebase Project ID    : ${projectId}`);
  console.log(` • Auth Users Created     : ${authResults.createdUsers}`);
  console.log(` • Auth Users Existing    : ${authResults.existingUsers}`);
  console.log(` • Roles Assigned/Updated : ${authResults.rolesUpdated}`);
  console.log(` • Categories Initialized : ${firestoreResults.categoriesCreated}`);
  console.log(` • Products Initialized   : ${firestoreResults.productsCreated}`);
  console.log(` • Coupons Initialized    : ${firestoreResults.couponsCreated}`);
  console.log(` • Settings Updated       : ${firestoreResults.settingsUpdated ? 'YES (/settings/store_settings)' : 'NO'}`);
  console.log(` • Storage Images Handled : ${firestoreResults.storageImagesHandled}`);
  console.log(` • Orders Created (Prod)  : 0 (Intentionally application-created)`);
  console.log(` • Inquiries Created (P)  : 0 (Intentionally customer-submitted)`);
  console.log(` • Reviews Created (Prod) : 0 (Intentionally patron-submitted)`);
  console.log('=============================================================\n');
}

bootstrap().catch(err => {
  console.error('\n❌ FIREBASE INITIALIZATION FAILED:');
  console.error(err.message || err);
  process.exit(1);
});
