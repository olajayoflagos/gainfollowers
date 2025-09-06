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

    const creditsSnap = await db()
      .collection('wallet_credits')
      .where('uid', '==', user.uid)
      .limit(100)
      .get();

    const debitsSnap = await db()
      .collection('wallet_debits')
      .where('uid', '==', user.uid)
      .limit(100)
      .get();

    const mapDoc = (d, type) => ({
      id: d.id,
      type,
      title: type === 'credit' ? 'Wallet top-up' : 'Service order',
      amountNGN: Number(d.data().amountNGN || 0),
      reference: d.data().reference || null,
      orderId: d.data().orderId || null,
      createdAt: d.data().createdAt || null,
    });

    const items = [
      ...creditsSnap.docs.map(d => mapDoc(d, 'credit')),
      ...debitsSnap.docs.map(d => mapDoc(d, 'debit')),
    ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}
