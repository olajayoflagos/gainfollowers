import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';
export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.split('Bearer ')[1];
    const user = await verifyIdToken(token);
    const snap = await db.collection('orders').where('uid','==',user.uid).orderBy('createdAt','desc').limit(50).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return Response.json({ items });
  } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
}
