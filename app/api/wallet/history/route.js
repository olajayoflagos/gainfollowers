// app/api/wallet/history/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);

    const creditsQ = await db()
      .collection('wallet_credits')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const debitsQ = await db()
      .collection('wallet_debits')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const credits = creditsQ.docs.map(d => ({
      id: d.id,
      type: 'credit',
      amountNGN: d.data().amountNGN || 0,
      createdAt: d.data().createdAt,
      reference: d.id,
      title: 'Wallet top-up',
      source: d.data().source || 'verify/webhook',
    }));

    const debits = debitsQ.docs.map(d => ({
      id: d.id,
      type: 'debit',
      amountNGN: d.data().amountNGN || 0,
      createdAt: d.data().createdAt,
      orderId: d.data().orderId,
      title: `Order #${d.data().orderId}`,
      source: d.data().source || 'order',
    }));

    const items = [...credits, ...debits]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100);

    return Response.json({ items });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
