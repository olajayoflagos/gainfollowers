import { assertAdmin } from '@/lib/adminGuard';
import { db } from '@/lib/firebaseAdmin';
export async function GET(req) {
  try {
    await assertAdmin(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);
    let q = db.collection('orders').orderBy('createdAt','desc').limit(limit);
    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return Response.json({ items });
  } catch (e) { return Response.json({ error: e.message }, { status: 401 }); }
}
