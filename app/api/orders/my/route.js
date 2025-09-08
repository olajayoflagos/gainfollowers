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

// Helper to parse query params
function qp(req) {
  const u = new URL(req.url);
  return {
    limit: Math.min(Math.max(Number(u.searchParams.get('limit') || 50), 1), 200),
    after: u.searchParams.get('after') || '', // cursor (doc id)
  };
}

export async function GET(req) {
  const idToken = getBearer(req);
  if (!idToken) return Response.json({ error: 'missing_token' }, { status: 401 });

  let user;
  try {
    user = await verifyIdToken(idToken);
  } catch {
    return Response.json({ error: 'invalid_token' }, { status: 401 });
  }

  const { limit, after } = qp(req);
  const col = db().collection('orders');

  try {
    // Try the ideal query (filter + orderBy)
    let q = col.where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(limit);

    // cursor support (by doc id)
    if (after) {
      // Find the doc to start after
      const afterDoc = await col.doc(after).get();
      if (afterDoc.exists) q = q.startAfter(afterDoc.get('createdAt') || '');
    }

    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // --- counts (best-effort)
    let totalCount = items.length;
    const byStatus = items.reduce((m, x) => {
      const s = (x.status || 'unknown').toLowerCase();
      m[s] = (m[s] || 0) + 1;
      return m;
    }, {});

    // Firestore aggregation count (if available in your SDK)
    try {
      const agg = await col.where('uid', '==', user.uid).count().get();
      totalCount = agg.data().count ?? totalCount;
    } catch { /* old SDK or rules; ignore */ }

    return Response.json({
      items,
      page: { limit, nextCursor: items.length ? items[items.length - 1].id : null },
      counts: { total: totalCount, byStatus },
    });
  } catch (e) {
    // If the error is “index required”, surface it and still return a fallback
    const msg = String(e?.message || '');
    const needsIndex =
      e?.code === 9 || // Firestore failed-precondition
      /needs a composite index/i.test(msg) ||
      /FAILED_PRECONDITION/i.test(msg);

    if (needsIndex) {
      // Fallback: query without orderBy (then sort in-memory)
      const snap = await col.where('uid', '==', user.uid).limit(limit).get();
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

      const byStatus = items.reduce((m, x) => {
        const s = (x.status || 'unknown').toLowerCase();
        m[s] = (m[s] || 0) + 1;
        return m;
      }, {});

      return Response.json({
        items,
        page: { limit, nextCursor: items.length ? items[items.length - 1].id : null },
        counts: { total: items.length, byStatus },
        index_required: true,
        hint:
          'Create a Firestore composite index for: where(uid ==) + orderBy(createdAt desc). In the Firebase console, add a composite index on (uid ASC, createdAt DESC).',
      });
    }

    return Response.json(
      { error: 'server_error', detail: msg },
      { status: 500 }
    );
  }
}