import { verifyIdToken, db } from '@/lib/firebaseAdmin';
export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);
    const snap = await db.collection('wallets').doc(user.uid).get();
    return Response.json({ uid:user.uid, email:user.email, balance: snap.exists ? snap.data().balance || 0 : 0 });
  } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
}
