/**
 * Centralized Public Runtime Configuration Boundary
 * 
 * SECURITY DIRECTIVE:
 * In client SPA applications (Vite), all VITE_* variables are publicly readable in browser JS.
 * Private API keys, SMS/Email provider tokens, and admin master credentials MUST NEVER reside in client configuration.
 * All administrative authorization is strictly enforced server-side via Firebase Auth Custom Claims & Firestore Security Rules.
 */

export interface EnvConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
    databaseId: string;
    isConfigured: boolean;
  };
  razorpay: {
    keyId: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
    signatureEndpoint: string;
    isConfigured: boolean;
  };
}

const getEnvVar = (key: string, defaultValue = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = import.meta.env[key];
    if (typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  return defaultValue;
};

const apiKey = getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDWB9sPanFfGUTHRuDCjt8V2mzZcLU-7Mg');

const cloudName = getEnvVar('VITE_CLOUDINARY_CLOUD_NAME', 'muety-atelier');
const uploadPreset = getEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET', 'muety_products_preset');

export const env: EnvConfig = {
  firebase: {
    apiKey,
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'muetystore-fdad2.firebaseapp.com'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'muetystore-fdad2'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'muetystore-fdad2.firebasestorage.app'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '1067274231232'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:1067274231232:web:0827b0b7be3cc52dd57c25'),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', 'G-M2NQ3KXCEK'),
    databaseId: getEnvVar('VITE_FIREBASE_DATABASE_ID', 'default'),
    isConfigured: Boolean(apiKey && !apiKey.includes('Dummy'))
  },
  razorpay: {
    keyId: getEnvVar('VITE_RAZORPAY_KEY_ID', 'rzp_test_TYe5hJ23uyUrno')
  },
  cloudinary: {
    cloudName,
    uploadPreset,
    signatureEndpoint: getEnvVar('VITE_CLOUDINARY_SIGNATURE_ENDPOINT', ''),
    isConfigured: Boolean(cloudName && uploadPreset)
  }
};
