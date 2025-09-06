export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

function getBearer(req) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : '';
}

export async function GET(req) {
  try {
    const idToken = getBearer(req);
    if (!idToken) return Response.json({ error: 'missing_token' }, { status: 401 });

    let user;
    try { user = await verifyIdToken(idToken); }
    catch { return Response.json({ error: 'invalid_token' }, { status: 401 }); }

    const q = await db()
      .collection('orders')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const items = q.docs.map(d => ({ id: d.id, ...d.data() }));
    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}
