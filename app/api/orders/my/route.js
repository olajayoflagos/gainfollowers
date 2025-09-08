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
  // slightly smaller default page for snappier load
  const limit = Math.min(Math.max(Number(u.searchParams.get('limit') || 30), 1), 200);
  const after = u.searchParams.get('after') || ''; // cursor = doc id
  return { limit, after };
}

export async function GET(req) {
  // ---- Auth ----
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
    // Ideal query: filter by uid + order by createdAt desc
    let q = col.where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(limit);

    // Cursor: look up the "after" doc and continue after its createdAt
    if (after) {
      const afterDoc = await col.doc(after).get();
      if (afterDoc.exists) {
        const afterCreated = afterDoc.get('createdAt') || '';
        q = q.startAfter(afterCreated);
      }
    }

    const snap = await q.get();
    const items = snap.docs.map((d) => {
      const data = d.data() || {};
      // normalize createdAt to string to avoid UI hiccups
      const createdAt = typeof data.createdAt === 'string'
        ? data.createdAt
        : (data.createdAt?.toISOString?.() || '');
      return { id: d.id, ...data, createdAt };
    });

    // ---- Counts (best-effort) ----
    let totalCount = items.length;
    const byStatus = items.reduce((m, x) => {
      const s = (x.status || 'unknown').toLowerCase();
      m[s] = (m[s] || 0) + 1;
      return m;
    }, {});

    // If your Firestore SDK supports aggregate count:
    try {
      const agg = await col.where('uid', '==', user.uid).count().get();
      if (typeof agg.data?.().count === 'number') totalCount = agg.data().count;
    } catch {
      /* ignore if not supported */
    }

    return Response.json({
      items,
      page: { limit, nextCursor: items.length ? items[items.length - 1].id : null },
      counts: { total: totalCount, byStatus },
    });
  } catch (e) {
    const msg = String(e?.message || '');
    const needsIndex =
      e?.code === 9 || /needs a composite index/i.test(msg) || /FAILED_PRECONDITION/i.test(msg);

    if (needsIndex) {
      // Fallback without orderBy (then sort in-memory)
      const snap = await col.where('uid', '==', user.uid).limit(limit).get();
      const items = snap.docs
        .map((d) => {
          const data = d.data() || {};
          const createdAt = typeof data.createdAt === 'string'
            ? data.createdAt
            : (data.createdAt?.toISOString?.() || '');
          return { id: d.id, ...data, createdAt };
        })
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
          'Create a Firestore composite index on (uid ASC, createdAt DESC) for collection "orders".',
      });
    }

    return Response.json({ error: 'server_error', detail: msg }, { status: 500 });
  }
}