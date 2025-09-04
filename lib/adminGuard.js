import { verifyIdToken, db } from '@/lib/firebaseAdmin';
export async function assertAdmin(req) {
  const auth = req.headers.get('authorization') || '';
  const idToken = auth.split('Bearer ')[1];
  if (!idToken) throw new Error('No token');
  const user = await verifyIdToken(idToken);
  const allowList = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowList.includes((user.email || '').toLowerCase())) return { uid: user.uid, email: user.email };
  const snap = await db().collection('admins').doc(user.uid).get();
  if (snap.exists && snap.data().isAdmin) return { uid: user.uid, email: user.email };
  throw new Error('Not admin');
}
