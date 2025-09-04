// app/api/user/me/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);

    const usersRef = db().collection('users').doc(user.uid);
    const walletRef = db().collection('wallets').doc(user.uid);

    // Create docs if missing
    const now = new Date().toISOString();
    const [uSnap, wSnap] = await Promise.all([usersRef.get(), walletRef.get()]);

    if (!uSnap.exists) {
      await usersRef.set({
        uid: user.uid,
        email: user.email || null,
        name: user.name || user.displayName || null,
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    }

    if (!wSnap.exists) {
      await walletRef.set({ balance: 0, createdAt: now }, { merge: true });
    }

    const current = (await walletRef.get()).data() || { balance: 0 };
    return Response.json({ uid: user.uid, balance: Number(current.balance || 0) });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
