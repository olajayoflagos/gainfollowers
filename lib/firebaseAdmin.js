import admin from 'firebase-admin';

/**
 * Lazy, build-safe Firebase Admin init.
 * - Does NOT throw during import when envs are missing (e.g., on Next.js build/analysis).
 * - Initializes on first use when envs are present.
 */
let initialized = false;

function tryInit() {
  if (initialized || admin.apps.length) {
    initialized = true;
    return true;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // If env vars unavailable at build time, do not throw—just skip init.
  if (!projectId || !clientEmail || !privateKey) {
    return false;
  }

  // Support both "\n" and actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialized = true;
  return true;
}

// Expose helpers that work whether we're initialized yet or not
export function getAdmin() {
  return tryInit() ? admin : null;
}

export const authAdmin = (() => (tryInit() ? admin.auth() : null))();
export const db = (() => (tryInit() ? admin.firestore() : null))();

export async function verifyIdToken(idToken) {
  if (!tryInit()) {
    throw new Error('Firebase Admin not configured: missing FIREBASE_* env vars');
  }
  return admin.auth().verifyIdToken(idToken);
}
