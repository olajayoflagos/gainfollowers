// app/api/admin/wallet/adjust/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { assertAdmin } from '@/lib/adminGuard';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req) {
  try {
    await assertAdmin(req);
    const { uid, delta } = await req.json();
    const nDelta = Number(delta);

    if (!uid || !Number.isFinite(nDelta)) {
      return Response.json({ error: 'Invalid params' }, { status: 400 });
    }

    const ref = db().collection('wallets').doc(uid);

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists ? Number(snap.data()?.balance || 0) : 0;
      tx.set(ref, { balance: prev + nDelta }, { merge: true });
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}