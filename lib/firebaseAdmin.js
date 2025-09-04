import admin from 'firebase-admin';

let _app;

function ensureApp() {
  if (_app) return _app;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw Object.assign(new Error('Firebase Admin not configured'), { code: 'app/invalid-credential' });
  }

  // Support both literal "\n" and real newlines
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

  _app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });

  return _app;
}

export const authAdmin = () => ensureApp().auth();
export const db        = () => ensureApp().firestore();
export const verifyIdToken = async (idToken) => authAdmin().verifyIdToken(idToken);
