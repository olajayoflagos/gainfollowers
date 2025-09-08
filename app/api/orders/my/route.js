// app/api/orders/my/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

function getBearer(req) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : '';
}
function qp(req) {
  const u = new URL(req.url);
  return {
    limit: Math.min(Math.max(Number(u.searchParams.get('limit') || 50), 1), 200),
    after: u.searchParams.get('after') || '',
  };
}

export async function GET(req) {
  const idToken = getBearer(req);
  if (!idToken) return Response.json({ error: 'missing_token' }, { status: 401 });

  let user;
  try { user = await verifyIdToken(idToken); }
  catch { return Response.json({ error: 'invalid_token' }, { status: 401 }); }

  const { limit, after } = qp(req);
  const col = db().collection('orders');

  try {
    let q = col.where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(limit);

    if (after) {
      const afterSnap = await col.doc(after).get();
      if (afterSnap.exists) q = q.startAfter(afterSnap); // snapshot cursor
    }

    const snap = await q.get();
    const items = snap.docs.map(d => {
      const x = d.data();
      const ca = x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : String(x.createdAt || '');
      const ua = x.updatedAt?.toDate ? x.updatedAt.toDate().toISOString() : String(x.updatedAt || '');
      return {
        id: d.id,
        ...x,
        createdAt: ca,
        updatedAt: ua,
      };
    });

    // Counts
    let totalCount = items.length;
    const byStatus = items.reduce((m, x) => {
      const s = String(x.status || 'unknown').toLowerCase();
      m[s] = (m[s] || 0) + 1;
      return m;
    }, {});

    try {
      const agg = await col.where('uid', '==', user.uid).count().get();
      totalCount = agg.data().count ?? totalCount;
    } catch {}

    return Response.json({
      items,
      page: { limit, nextCursor: items.length ? items[items.length - 1].id : null },
      counts: { total: totalCount, byStatus },
    });
  } catch (e) {
    const msg = String(e?.message || '');
    const needsIndex = e?.code === 9 || /needs a composite index|FAILED_PRECONDITION/i.test(msg);

    if (needsIndex) {
      const snap = await col.where('uid', '==', user.uid).limit(limit).get();
      const items = snap.docs
        .map(d => {
          const x = d.data();
          const ca = x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : String(x.createdAt || '');
          const ua = x.updatedAt?.toDate ? x.updatedAt.toDate().toISOString() : String(x.updatedAt || '');
          return { id: d.id, ...x, createdAt: ca, updatedAt: ua };
        })
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt));

      const byStatus = items.reduce((m, x) => {
        const s = String(x.status || 'unknown').toLowerCase();
        m[s] = (m[s] || 0) + 1;
        return m;
      }, {});

      return Response.json({
        items,
        page: { limit, nextCursor: items.length ? items[items.length - 1].id : null },
        counts: { total: items.length, byStatus },
        index_required: true,
        hint: 'Create composite index (uid ASC, createdAt DESC) on collection "orders".',
      });
    }

    return Response.json({ error: 'server_error', detail: msg }, { status: 500 });
  }
}