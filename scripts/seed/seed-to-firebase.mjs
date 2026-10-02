import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDWB9sPanFfGUTHRuDCjt8V2mzZcLU-7Mg",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "muetystore-fdad2.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "muetystore-fdad2",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "muetystore-fdad2.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1067274231232",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:1067274231232:web:0827b0b7be3cc52dd57c25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'default');

const CATEGORIES = [
  {
    id: 'cat-sarees',
    name: 'Festive Silk Sarees',
    slug: 'sarees',
    description: 'Handwoven pure Kanchipuram & Banarasi mulberry silk sarees with authentic 24K gold zari borders.',
    image: '/saree_model_individual.jpg',
    itemCount: 6,
    featured: true
  },
  {
    id: 'cat-timepieces',
    name: 'Timepieces',
    slug: 'timepieces',
    description: 'Precision mechanical & minimalist automatic luxury watches crafted with sapphire crystal and surgical stainless steel.',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80',
    itemCount: 4,
    featured: true
  },
  {
    id: 'cat-leather-goods',
    name: 'Leather Goods',
    slug: 'leather-goods',
    description: 'Full-grain Italian leather bags, handcrafted wallets, and travel accessories tailored for timeless elegance.',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
    itemCount: 5,
    featured: true
  },
  {
    id: 'cat-apparel',
    name: 'Luxury Apparel',
    slug: 'apparel',
    description: 'Organic cashmere knitwear, tailored jackets, and architectural minimalism designed for modern sophistication.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
    itemCount: 4,
    featured: true
  },
  {
    id: 'cat-eyewear',
    name: 'Designer Eyewear',
    slug: 'eyewear',
    description: 'Hand-polished Japanese acetate and ultralight titanium frames with polarized UV400 lenses.',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
    itemCount: 3,
    featured: true
  },
  {
    id: 'cat-fragrance',
    name: 'Artisan Fragrance',
    slug: 'fragrance',
    description: 'Bespoke unisex perfumes, botanical diffusers, and luxury hand-poured soy candles.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80',
    itemCount: 3,
    featured: false
  },
  {
    id: 'cat-audio',
    name: 'Acoustic Audio',
    slug: 'audio',
    description: 'Audiophile grade wireless headphones and bespoke aluminum sound systems.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    itemCount: 3,
    featured: false
  }
];

const PRODUCTS = [
  {
    id: 'muety-saree-01',
    name: 'MUETY Royal Kanchipuram Pure Silk Saree',
    title: 'MUETY Royal Kanchipuram Pure Silk Saree',
    slug: 'royal-kanchipuram-pure-silk-saree',
    shortDescription: 'Handwoven pure mulberry silk in cream with royal emerald green & 24K gold zari elephant border.',
    description: 'A masterpiece of royal Indian handloom heritage. Handwoven with 100% pure mulberry silk in regal ivory cream, paired with a rich emerald green Korvai border and pallu intricately woven with gold zari elephant and peacock motifs. Includes matching unstitched pure silk blouse piece.',
    price: 480,
    originalPrice: 650,
    discountPercentage: 26,
    rating: 5.0,
    reviewCount: 42,
    stock: 12,
    inventory: 12,
    status: 'active',
    sku: 'MUETY-S-001',
    category: 'Festive Silk Sarees',
    categorySlug: 'sarees',
    images: [
      '/saree_model_individual.jpg',
      '/saree_fabric_detail.jpg',
      '/saree_model_drape.jpg'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: true,
    tags: ['Pure Silk', 'Kanchipuram', 'Gold Zari', 'Diwali Special', 'Festive Heritage', 'Handloom'],
    specifications: {
      'Fabric': '100% Pure Mulberry Silk (Silk Mark Certified)',
      'Zari': 'Gold Thread Zari Weave',
      'Border Detail': 'Emerald Green Korvai Elephant & Peacock Border',
      'Length': '6.2 Meters (Includes 0.8M Unstitched Blouse)',
      'Weave Technique': 'Handloom Interlocking Korvai',
      'Care': 'Dry Clean Only • Store in Pure Muslin Bag'
    },
    colors: ['Regal Cream & Emerald Green', 'Gold Accents'],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'muety-watch-01',
    name: 'MUETY Chrono Horizon Sapphire Watch',
    title: 'MUETY Chrono Horizon Sapphire Watch',
    slug: 'chrono-horizon-sapphire-watch',
    shortDescription: 'Minimalist automatic chronograph with double-domed sapphire crystal and Italian calfskin strap.',
    description: 'The MUETY Chrono Horizon represents the pinnacle of contemporary horology. Featuring a custom Japanese automatic movement with 42-hour power reserve, 316L aerospace-grade stainless steel case, and anti-reflective sapphire crystal. Designed for the discerning individual who appreciates subtle mastery.',
    price: 495,
    originalPrice: 620,
    discountPercentage: 20,
    rating: 4.9,
    reviewCount: 48,
    stock: 15,
    inventory: 15,
    status: 'active',
    sku: 'MUETY-W-001',
    category: 'Timepieces',
    categorySlug: 'timepieces',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80'
    ],
    featured: true,
    isNewArrival: true,
    isBestSeller: true,
    tags: ['Luxury', 'Automatic', 'Water Resistant 50M', 'Sapphire'],
    specifications: {
      'Case Diameter': '40mm',
      'Case Material': '316L Stainless Steel',
      'Movement': 'Automatic Caliber 8215',
      'Glass': 'Double-Domed Sapphire',
      'Water Resistance': '5 ATM / 50 Meters',
      'Strap Width': '20mm Genuine Italian Leather'
    },
    colors: ['Obsidian Black', 'Champagne Gold', 'Brushed Silver'],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  }
];

const COUPONS = [
  {
    id: 'coup-diwali',
    code: 'DIWALI25',
    discountType: 'percentage',
    discountValue: 25,
    minSpend: 150,
    isActive: true,
    usageCount: 260,
    description: '✨ Shubh Deepavali 25% Off Storewide + Gold Gift Packaging',
    expiresAt: '2027-12-31'
  }
];

async function seed() {
  console.log('🚀 Starting Firebase Firestore seeding for MUETY Store...');
  console.log(`Connecting to Firestore Project: ${firebaseConfig.projectId}`);

  try {
    for (const cat of CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), cat, { merge: true });
      console.log(`   ✓ Category: ${cat.name} (${cat.id})`);
    }

    for (const prod of PRODUCTS) {
      await setDoc(doc(db, 'products', prod.id), prod, { merge: true });
      console.log(`   ✓ Product: ${prod.name} (${prod.id})`);
    }

    for (const coup of COUPONS) {
      await setDoc(doc(db, 'coupons', coup.id), coup, { merge: true });
      console.log(`   ✓ Coupon: ${coup.code} (${coup.id})`);
    }

    const verifyProdSnap = await getDocs(collection(db, 'products'));
    console.log('\n=============================================');
    console.log(`🎉 FIRESTORE SEEDING COMPLETE! Total Products: ${verifyProdSnap.size}`);
    console.log('=============================================\n');
  } catch (err) {
    console.error('❌ Firestore Seeding Error:', err);
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));
