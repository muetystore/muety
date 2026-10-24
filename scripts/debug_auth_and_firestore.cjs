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

async function main() {
  console.log('--- FIREBASE AUTH USERS ---');
  const userRecords = await auth.listUsers(100);
  console.log(`Found ${userRecords.users.length} Auth users:`);
  userRecords.users.forEach(u => {
    console.log({
      uid: u.uid,
      email: u.email,
      phone: u.phoneNumber,
      name: u.displayName,
      providers: u.providerData.map(p => p.providerId)
    });
  });

  console.log('\n--- FIRESTORE USERS COLLECTION ---');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users docs:`);
  usersSnap.forEach(d => console.log(d.id, d.data().email, d.data().displayName, d.data().phoneNumber || d.data().phone));

  console.log('\n--- FIRESTORE CUSTOMERS COLLECTION ---');
  const custsSnap = await db.collection('customers').get();
  console.log(`Found ${custsSnap.size} customers docs:`);
  custsSnap.forEach(d => console.log(d.id, d.data().email, d.data().displayName, d.data().phoneNumber || d.data().phone));

  console.log('\n--- FIRESTORE ORDERS COLLECTION ---');
  const ordersSnap = await db.collection('orders').get();
  console.log(`Found ${ordersSnap.size} orders docs:`);
  ordersSnap.forEach(d => {
    const o = d.data();
    console.log(d.id, o.orderNumber, o.customerId, o.customerEmail, o.total, o.orderStatus);
  });
}

main().catch(console.error);
