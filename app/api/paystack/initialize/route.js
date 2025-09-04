export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

//import { verifyIdToken } from '../../../lib/firebaseClientAuth'; // if you don't have this, see note below
// If your verify lives in lib/firebaseAdmin.js (lazy initializer), then do:
import { verifyIdToken } from '../../../lib/firebaseAdmin';

export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);

    const { amount, callbackUrl } = await req.json();
    if (!amount || Number(amount) <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const ref = `GF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const body = {
      email: user.email,
      amount: Math.round(Number(amount) * 100), // kobo
      reference: ref,
      metadata: { uid: user.uid, email: user.email, site: 'gainfollowers' },
      callback_url:
        callbackUrl ||
        (process.env.NEXT_PUBLIC_BASE_URL
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/paystack/callback`
          : undefined),
    };

    const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await psRes.json();
    if (!psRes.ok || !data?.data?.authorization_url) {
      return Response.json({ error: 'Paystack init failed', detail: data }, { status: 502 });
    }

    return Response.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (e) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
