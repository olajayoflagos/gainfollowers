export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { db } from '../../../lib/firebaseAdmin'; // adjust path if needed

export async function POST(req) {
  try {
    const { reference } = await req.json();
    if (!reference) return Response.json({ error: 'Missing reference' }, { status: 400 });

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok || !json?.data) {
      return Response.json({ error: 'Verify failed', detail: json }, { status: 502 });
    }

    const data = json.data;
    if (data.status !== 'success') {
      return Response.json({ ok: false, status: data.status });
    }

    const uid = data?.metadata?.uid;
    const amountNGN = (data.amount ?? 0) / 100;

    if (!uid || amountNGN <= 0) {
      return Response.json({ ok: false, status: 'ignored' });
    }

    // Idempotent credit: if this reference was processed, skip
    const creditRef = db().collection('wallet_credits').doc(reference);
    const walletRef = db().collection('wallets').doc(uid);

    await db().runTransaction(async (tx) => {
      const cSnap = await tx.get(creditRef);
      if (cSnap.exists) return; // already credited

      const wSnap = await tx.get(walletRef);
      const prev = wSnap.exists ? (wSnap.data().balance || 0) : 0;

      tx.set(walletRef, { balance: prev + amountNGN }, { merge: true });
      tx.set(creditRef, {
        uid,
        amountNGN,
        reference,
        source: 'verify',
        createdAt: new Date().toISOString(),
      });
    });

    return Response.json({ ok: true, credited: amountNGN });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
