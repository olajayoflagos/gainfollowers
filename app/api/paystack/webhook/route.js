export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import crypto from 'crypto';
import { verifyIdToken, db } from '../../../../lib/firebaseAdmin'; // adjust path if needed

export async function POST(req) {
  // Get raw text for signature check
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (hash !== signature) {
    return new Response('Invalid signature', { status: 401 });
  }

  const evt = JSON.parse(rawBody);

  // Only wallet top-ups we initiated
  if (evt.event === 'charge.success') {
    const data = evt.data;
    const uid = data?.metadata?.uid;
    const amountNGN = (data?.amount ?? 0) / 100;
    const reference = data?.reference;

    if (uid && amountNGN > 0) {
      // Idempotency: ensure we don't double-credit if Paystack retries
      const creditRef = db().collection('wallet_credits').doc(reference);
      const walletRef = db().collection('wallets').doc(uid);

      await db().runTransaction(async (tx) => {
        const cSnap = await tx.get(creditRef);
        if (cSnap.exists) return; // already processed

        const wSnap = await tx.get(walletRef);
        const prev = wSnap.exists ? (wSnap.data().balance || 0) : 0;

        tx.set(walletRef, { balance: prev + amountNGN }, { merge: true });
        tx.set(creditRef, {
          uid,
          amountNGN,
          reference,
          createdAt: new Date().toISOString(),
        });
      });
    }
  }

  return Response.json({ ok: true });
}
