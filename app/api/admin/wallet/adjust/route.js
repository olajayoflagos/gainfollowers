import { assertAdmin } from '@/lib/adminGuard';
import { db } from '@/lib/firebaseAdmin';
export async function POST(req) {
  try {
    await assertAdmin(req);
    const { uid, delta } = await req.json();
    if (!uid || !Number.isFinite(Number(delta))) return Response.json({ error: 'Invalid params' }, { status: 400 });
    const ref = db.collection('wallets').doc(uid);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const prev = snap.exists ? (snap.data().balance || 0) : 0;
      tx.set(ref, { balance: prev + Number(delta) }, { merge: true });
    });
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 401 }); }
}
