 /**
 * Centralized Public Runtime Configuration Boundary
 * 
 * SECURITY DIRECTIVE:
 * In client SPA applications (Vite), all VITE_* variables are publicly readable in browser JS.
 * Private API keys, SMS/Email provider tokens, and admin master credentials MUST NEVER reside in client configuration.
 * All administrative authorization is strictly enforced server-side via Firebase Auth Custom Claims & Firestore Security Rules.
 */

export interface EnvConfig {
  adminAppUrl: string;
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
    apiKey: string;
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

const apiKey = getEnvVar('VITE_FIREBASE_API_KEY', '');
const cloudName = getEnvVar('VITE_CLOUDINARY_CLOUD_NAME', '');
const cloudinaryApiKey = getEnvVar('VITE_CLOUDINARY_API_KEY', '');

export const env: EnvConfig = {
  adminAppUrl: getEnvVar('VITE_ADMIN_APP_URL', 'https://www.admin.muety.in'),
  firebase: {
    apiKey,
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', ''),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', ''),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', ''),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: getEnvVar('VITE_FIREBASE_APP_ID', ''),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', ''),
    databaseId: getEnvVar('VITE_FIREBASE_DATABASE_ID', 'default'),
    isConfigured: Boolean(apiKey && !apiKey.includes('Dummy'))
  },
  razorpay: {
    keyId: getEnvVar('VITE_RAZORPAY_KEY_ID', '')
  },
  cloudinary: {
    cloudName,
    apiKey: cloudinaryApiKey,
    signatureEndpoint: getEnvVar('VITE_CLOUDINARY_SIGNATURE_ENDPOINT', '/api/media/cloudinary-signature'),
    isConfigured: Boolean(cloudName)
  }
};
