// app/api/admin/orders/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { assertAdmin } from '@/lib/adminGuard';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req) {
  try {
    await assertAdmin(req);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 200);

    // IMPORTANT: db() is a function in your setup
    let q = db().collection('orders').orderBy('createdAt', 'desc').limit(limit);

    const snap = await q.get();
    const items = snap.docs.map((d) => {
      const x = d.data();
      // Normalize Timestamps to ISO strings so the UI doesn’t crash on .slice()
      const createdAt = x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : String(x.createdAt || '');
      const updatedAt = x.updatedAt?.toDate ? x.updatedAt.toDate().toISOString() : String(x.updatedAt || '');
      return { id: d.id, ...x, createdAt, updatedAt };
    });

    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}