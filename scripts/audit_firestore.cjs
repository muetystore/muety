const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);
const auth = getAuth(app);

async function runAudit() {
  console.log('=== FIREBASE AUTH & FIRESTORE AUDIT ===');
  
  // 1. Firebase Auth Users
  const authUsers = [];
  try {
    const listUsersResult = await auth.listUsers(100);
    listUsersResult.users.forEach(u => {
      authUsers.push({
        uid: u.uid,
        email: u.email,
        emailVerified: u.emailVerified,
        phoneNumber: u.phoneNumber,
        displayName: u.displayName,
        providerData: u.providerData.map(p => ({ providerId: p.providerId, uid: p.uid, email: p.email, phoneNumber: p.phoneNumber })),
        customClaims: u.customClaims
      });
    });
    console.log(`\n[AUTH USERS] (${authUsers.length}):`);
    authUsers.forEach(u => console.log(' ', JSON.stringify(u)));
  } catch (err) {
    console.warn('[AUTH LIST ERROR]', err.message);
  }

  // 2. Firestore Collections
  const [uSnap, cSnap, aSnap, oSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('customers').get(),
    db.collection('admins').get(),
    db.collection('orders').get()
  ]);

  console.log(`\n[FIRESTORE users] (${uSnap.size}):`);
  uSnap.forEach(d => console.log(' ', d.id, JSON.stringify(d.data())));

  console.log(`\n[FIRESTORE customers] (${cSnap.size}):`);
  cSnap.forEach(d => console.log(' ', d.id, JSON.stringify(d.data())));

  console.log(`\n[FIRESTORE admins] (${aSnap.size}):`);
  aSnap.forEach(d => console.log(' ', d.id, JSON.stringify(d.data())));

  console.log(`\n[FIRESTORE orders] (${oSnap.size}):`);
  oSnap.forEach(d => {
    const data = d.data();
    console.log(' ', d.id, JSON.stringify({
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      total: data.total,
      orderStatus: data.orderStatus,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      createdAt: data.createdAt
    }));
  });
}

runAudit().catch(console.error);
