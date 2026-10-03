import { getAdminDb, getAdminStorage } from './admin-init.mjs';
import fs from 'fs';
import path from 'path';

export async function runFirestoreSeed() {
  const db = getAdminDb();
  const configDir = path.resolve(process.cwd(), 'scripts/firebase/config');

  const settingsPath = path.join(configDir, 'muety-settings.json');
  const catalogPath = path.join(configDir, 'catalog.json');
  const couponsPath = path.join(configDir, 'coupons.json');

  if (!fs.existsSync(settingsPath)) {
    throw new Error(`MISSING CONFIGURATION: ${settingsPath} does not exist. Cannot seed StoreSettings without verified business data.`);
  }

  if (!fs.existsSync(catalogPath)) {
    throw new Error(`MISSING CONFIGURATION: ${catalogPath} does not exist. Cannot seed Product Catalog without verified business products.`);
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const coupons = fs.existsSync(couponsPath) ? JSON.parse(fs.readFileSync(couponsPath, 'utf8')) : [];

  let settingsUpdated = false;
  let categoriesCreated = 0;
  let productsCreated = 0;
  let couponsCreated = 0;
  let storageImagesHandled = 0;

  // 1. Store Settings Upsert
  const settingsRef = db.collection('settings').doc('store_settings');
  await settingsRef.set(settings, { merge: true });
  settingsUpdated = true;
  console.log(`   ✓ Store Settings initialized in Firestore (/settings/store_settings)`);

  // 2. Categories Initialization
  if (Array.isArray(catalog.categories)) {
    for (const cat of catalog.categories) {
      if (!cat.id) continue;
      const catRef = db.collection('categories').doc(cat.id);
      await catRef.set(cat, { merge: true });
      categoriesCreated++;
      console.log(`   ✓ Category: ${cat.name} (${cat.id})`);
    }
  }

  // 3. Products & Image Asset Resolution
  if (Array.isArray(catalog.products)) {
    for (const prod of catalog.products) {
      if (!prod.id) continue;

      // Check if any product images require Firebase Storage upload
      const resolvedImages = [];
      if (Array.isArray(prod.images)) {
        for (const imgPath of prod.images) {
          if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('/')) {
            resolvedImages.push(imgPath);
          } else {
            // Local file upload to Firebase Storage
            const localFile = path.resolve(process.cwd(), imgPath);
            if (fs.existsSync(localFile)) {
              try {
                const storage = getAdminStorage();
                const bucket = storage.bucket();
                const destPath = `products/${prod.id}/${path.basename(localFile)}`;
                const [file] = await bucket.upload(localFile, { destination: destPath, public: true });
                const publicUrl = file.publicUrl();
                resolvedImages.push(publicUrl);
                storageImagesHandled++;
                console.log(`   ✓ Uploaded local image to Firebase Storage: ${destPath}`);
              } catch (sErr) {
                console.warn(`   ⚠️ Firebase Storage upload warning for ${imgPath}:`, sErr.message);
                resolvedImages.push(imgPath);
              }
            } else {
              resolvedImages.push(imgPath);
            }
          }
        }
      }

      const sanitizedProduct = {
        ...prod,
        images: resolvedImages,
        updatedAt: new Date().toISOString()
      };

      const prodRef = db.collection('products').doc(prod.id);
      await prodRef.set(sanitizedProduct, { merge: true });
      productsCreated++;
      console.log(`   ✓ Product: ${prod.name} (${prod.id})`);
    }
  }

  // 4. Coupons Initialization
  if (Array.isArray(coupons)) {
    for (const coupon of coupons) {
      if (!coupon.id) continue;
      const cpnRef = db.collection('coupons').doc(coupon.id);
      await cpnRef.set(coupon, { merge: true });
      couponsCreated++;
      console.log(`   ✓ Coupon: ${coupon.code} (${coupon.id})`);
    }
  }

  return {
    settingsUpdated,
    categoriesCreated,
    productsCreated,
    couponsCreated,
    storageImagesHandled
  };
}
