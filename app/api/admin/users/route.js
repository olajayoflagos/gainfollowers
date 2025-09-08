// app/api/admin/users/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { assertAdmin } from '@/lib/adminGuard';
import { db, authAdmin } from '@/lib/firebaseAdmin';

export async function GET(req) {
  try {
    await assertAdmin(req);

    const walletsSnap = await db().collection('wallets').limit(200).get();

    const users = await Promise.all(
      walletsSnap.docs.map(async (d) => {
        const uid = d.id;
        const balance = Number(d.data()?.balance || 0);
        try {
          const u = await authAdmin().getUser(uid);
          return {
            uid,
            email: u.email || null,
            disabled: !!u.disabled,
            balance,
            displayName: u.displayName || null,
          };
        } catch {
          return { uid, email: null, disabled: null, balance, displayName: null };
        }
      })
    );

    return Response.json({ users });
  } catch (e) {
    return Response.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}