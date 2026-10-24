import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

function loadEnvConfig() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      envVars[key] = val;
    }
  });
  return envVars;
}

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isDryRun = !isApply;

async function run() {
  console.log('================================================================');
  console.log('   MUETY STORE — CATEGORY & PRODUCT INTEGRITY REPAIR UTILITY    ');
  console.log('================================================================');
  console.log(`Execution Mode: ${isApply ? 'APPLY (LIVE WRITES)' : 'DRY-RUN (SIMULATION ONLY)'}`);

  const env = loadEnvConfig();
  const projectId = env.VITE_FIREBASE_PROJECT_ID || 'muetystore-fdad2';

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // 1. Fetch current data
  console.log('\n[1/4] Reading live Firestore documents...');
  const catSnap = await getDocs(collection(db, 'categories'));
  const prodSnap = await getDocs(collection(db, 'products'));
  const codeSnap = await getDocs(collection(db, 'categoryCodes'));

  const categories = [];
  catSnap.forEach(d => categories.push({ id: d.id, ...d.data() }));

  const products = [];
  prodSnap.forEach(d => products.push({ id: d.id, ...d.data() }));

  const categoryCodes = [];
  codeSnap.forEach(d => categoryCodes.push({ id: d.id, ...d.data() }));

  console.log(`Fetched ${categories.length} categories, ${products.length} products, ${categoryCodes.length} categoryCodes.`);

  // 2. Perform automated JSON backup
  const backupDir = path.resolve('scripts', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `firestore_backup_${timestamp}.json`);
  const backupData = {
    timestamp: new Date().toISOString(),
    categories,
    products,
    categoryCodes
  };
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`[Backup] Automated snapshot saved to: ${backupFile}`);

  // 3. Diagnostic Classification
  console.log('\n[2/4] Classifying existing records...');
  const activeCatMap = new Map();
  categories.forEach(c => {
    activeCatMap.set(c.id, c);
  });

  const proposedProductUpdates = [];
  const diagnosticSummary = {
    valid: [],
    legacy_normalization: [],
    unresolved_deleted: [],
    unresolved_seed: [],
    inconsistent_reference: []
  };

  products.forEach(p => {
    const rawIds = Array.isArray(p.categoryIds) ? p.categoryIds : (p.categoryId ? [p.categoryId] : []);
    const primaryId = p.primaryCategoryId || rawIds[0] || '';
    const activeCategoryMatch = categories.find(c => rawIds.includes(c.id));

    // Case A: Super - multiple categoryIds including both slug "sarees" and valid id "cat-1791267027302"
    if (activeCategoryMatch && rawIds.length > 1) {
      diagnosticSummary.legacy_normalization.push({
        id: p.id,
        title: p.title || p.name,
        sku: p.sku,
        currentCategoryIds: rawIds,
        activeCategory: activeCategoryMatch.name,
        reason: 'Multiple entries in categoryIds containing legacy slug and active category ID'
      });

      proposedProductUpdates.push({
        id: p.id,
        title: p.title || p.name,
        changes: {
          categoryIds: [activeCategoryMatch.id],
          primaryCategoryId: activeCategoryMatch.id,
          categoryId: activeCategoryMatch.id,
          category: activeCategoryMatch.name,
          categorySlug: activeCategoryMatch.slug
        },
        reason: 'Normalize legacy categoryIds array to canonical active category ID'
      });
      return;
    }

    // Case B: Premium saree (prod-1792602405166) - category name matches "saree-test-cat", but categoryIds has "cat-sarees"
    const catByName = categories.find(c => 
      c.name.toLowerCase() === (p.category || '').toLowerCase() || 
      c.slug.toLowerCase() === (p.categorySlug || '').toLowerCase()
    );
    if (!activeCategoryMatch && catByName) {
      diagnosticSummary.inconsistent_reference.push({
        id: p.id,
        title: p.title || p.name,
        sku: p.sku,
        currentCategoryIds: rawIds,
        targetCategory: catByName.name,
        reason: 'Category name/slug matches active category, but categoryIds points to legacy seed ID'
      });

      proposedProductUpdates.push({
        id: p.id,
        title: p.title || p.name,
        changes: {
          categoryIds: [catByName.id],
          primaryCategoryId: catByName.id,
          categoryId: catByName.id,
          category: catByName.name,
          categorySlug: catByName.slug
        },
        reason: 'Link to active category matched by name/slug'
      });
      return;
    }

    // Case C: Deleted category V45HYntNgV6yaicEI5Zl (sem, eriu egher ierreoi, eriu 98ihdfriovdf)
    if (rawIds.includes('V45HYntNgV6yaicEI5Zl') || p.category === 'kob') {
      diagnosticSummary.unresolved_deleted.push({
        id: p.id,
        title: p.title || p.name,
        sku: p.sku,
        category: p.category,
        categoryIds: rawIds,
        reason: 'References deleted category V45HYntNgV6yaicEI5Zl (historical name: "kob", code: "KO")'
      });
      // Do not arbitrarily reassign to an unrelated category! Preserved safely with clean metadata.
      return;
    }

    // Case D: References initial seed ID cat-sarees
    if (rawIds.includes('cat-sarees')) {
      diagnosticSummary.unresolved_seed.push({
        id: p.id,
        title: p.title || p.name,
        sku: p.sku,
        category: p.category,
        categoryIds: rawIds,
        reason: 'References seed catalog category "cat-sarees"'
      });
      return;
    }

    // Case E: Fully valid
    if (activeCategoryMatch && rawIds.length === 1 && rawIds[0] === activeCategoryMatch.id) {
      diagnosticSummary.valid.push({
        id: p.id,
        title: p.title || p.name,
        sku: p.sku,
        category: activeCategoryMatch.name
      });
    }
  });

  console.log('\n--- DIAGNOSTIC CLASSIFICATION REPORT ---');
  console.log(`✓ Fully Valid: ${diagnosticSummary.valid.length}`);
  console.log(`⚡ Legacy Normalization Required: ${diagnosticSummary.legacy_normalization.length}`);
  diagnosticSummary.legacy_normalization.forEach(i => console.log(`   - [${i.sku}] "${i.title}": ${i.reason}`));

  console.log(`⚡ Inconsistent Reference: ${diagnosticSummary.inconsistent_reference.length}`);
  diagnosticSummary.inconsistent_reference.forEach(i => console.log(`   - [${i.sku}] "${i.title}": ${i.reason}`));

  console.log(`⚠️ Unresolved Deleted Categories: ${diagnosticSummary.unresolved_deleted.length}`);
  diagnosticSummary.unresolved_deleted.forEach(i => console.log(`   - [${i.sku}] "${i.title}": ${i.reason}`));

  console.log(`⚠️ Unresolved Seed Categories: ${diagnosticSummary.unresolved_seed.length}`);
  diagnosticSummary.unresolved_seed.forEach(i => console.log(`   - [${i.sku}] "${i.title}": ${i.reason}`));

  // 4. Category product count calculation
  console.log('\n[3/4] Evaluating Category Product Counts...');
  const categoryCountUpdates = [];
  categories.forEach(cat => {
    // Count products currently or newly associated with this category
    const count = products.filter(p => {
      const pendingUpdate = proposedProductUpdates.find(u => u.id === p.id);
      if (pendingUpdate && pendingUpdate.changes.categoryIds) {
        return pendingUpdate.changes.categoryIds.includes(cat.id);
      }
      const pIds = Array.isArray(p.categoryIds) ? p.categoryIds : (p.categoryId ? [p.categoryId] : []);
      return pIds.includes(cat.id);
    }).length;

    console.log(`   Category "${cat.name}" (${cat.id}): Current itemCount=${cat.itemCount || 0} -> Computed live count=${count}`);
    if (cat.itemCount !== count) {
      categoryCountUpdates.push({
        id: cat.id,
        name: cat.name,
        newCount: count
      });
    }
  });

  // 5. Execution or Dry-run output
  console.log('\n[4/4] Proposed Changes Execution...');
  console.log(`Total Product Updates Proposed: ${proposedProductUpdates.length}`);
  proposedProductUpdates.forEach((u, idx) => {
    console.log(`\n#${idx + 1} Product: ${u.title} (${u.id})`);
    console.log(`   Reason: ${u.reason}`);
    console.log(`   Changes: ${JSON.stringify(u.changes, null, 2)}`);
  });

  console.log(`\nTotal Category Count Synchronizations: ${categoryCountUpdates.length}`);
  categoryCountUpdates.forEach(u => {
    console.log(`   Category "${u.name}" (${u.id}) -> itemCount: ${u.newCount}`);
  });

  if (isDryRun) {
    console.log('\n================================================================');
    console.log(' DRY-RUN COMPLETED: No changes were written to live Firestore.   ');
    console.log(' To apply these changes, run with: node scripts/category_integrity_repair.mjs --apply');
    console.log('================================================================');
  } else {
    console.log('\nApplying updates to live Firestore...');
    for (const u of proposedProductUpdates) {
      const prodRef = doc(db, 'products', u.id);
      await updateDoc(prodRef, {
        ...u.changes,
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Updated product ${u.id} (${u.title})`);
    }

    for (const c of categoryCountUpdates) {
      const catRef = doc(db, 'categories', c.id);
      await updateDoc(catRef, {
        itemCount: c.newCount,
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Synchronized itemCount for category "${c.name}"`);
    }

    console.log('\n================================================================');
    console.log(' ALL UPDATES APPLIED SUCCESSFULLY TO LIVE FIRESTORE!            ');
    console.log('================================================================');
  }
}

run().catch(err => {
  console.error('Fatal error during repair execution:', err);
  process.exit(1);
});
