import { assertAdmin } from '@/lib/adminGuard';
import { db, authAdmin } from '@/lib/firebaseAdmin';
export async function GET(req) {
  try {
    await assertAdmin(req);
    const walletsSnap = await db.collection('wallets').limit(200).get();
    const users = await Promise.all(walletsSnap.docs.map(async (d) => {
      try { const u = await authAdmin.getUser(d.id); return { uid: d.id, email: u.email, disabled: u.disabled, balance: d.data().balance || 0 }; }
      catch { return { uid: d.id, email: null, disabled: null, balance: d.data().balance || 0 }; }
    }));
    return Response.json({ users });
  } catch (e) { return Response.json({ error: e.message }, { status: 401 }); }
}
