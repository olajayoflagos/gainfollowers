export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

function getBearer(req) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : '';
}

async function japStatus(japOrderId) {
  const url = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';
  const form = new URLSearchParams();
  form.set('key', process.env.JAP_API_KEY || '');
  form.set('action', 'status');
  form.set('order', String(japOrderId));

  // 10s timeout
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);

  let res, text, data;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: ac.signal,
    });
    text = await res.text();
    try { data = JSON.parse(text); } catch { data = null; }
  } finally {
    clearTimeout(t);
  }

  if (!res.ok || !data) {
    const msg = (data && (data.error || data.message)) || text || `JAP status failed (${res.status})`;
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }
  return data;
}

export async function POST(req) {
  try {
    // ---- Auth ----
    const token = getBearer(req);
    if (!token) return Response.json({ error: 'missing_token' }, { status: 401 });

    let user;
    try { user = await verifyIdToken(token); }
    catch { return Response.json({ error: 'invalid_token' }, { status: 401 }); }

    // ---- Input ----
    const { orderId, japOrderId } = await req.json();

    if (!orderId && !japOrderId) {
      return Response.json({ error: 'Missing orderId or japOrderId' }, { status: 400 });
    }

    // If client passed local orderId, resolve to provider id AND check ownership.
    let targetJapId = japOrderId;
    if (!targetJapId && orderId) {
      const snap = await db().collection('orders').doc(String(orderId)).get();
      if (!snap.exists) {
        return Response.json({ error: 'order_not_found' }, { status: 404 });
      }
      const doc = snap.data();
      if (doc.uid !== user.uid) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      if (!doc.japOrderId) {
        return Response.json({ error: 'order_not_placed_yet' }, { status: 409 });
      }
      targetJapId = String(doc.japOrderId);
    }

    // ---- Call provider ----
    const raw = await japStatus(targetJapId);

    // Normalize some fields commonly returned by JAP
    const norm = {
      japOrderId: targetJapId,
      status: raw.status || raw.Status || 'unknown',
      remains: Number(raw.remains ?? raw.Remains ?? 0),
      charge: Number(raw.charge ?? raw.Charge ?? 0),
      start_count: Number(raw.start_count ?? raw['start_count'] ?? 0),
      currency: (raw.currency || raw.Currency || 'USD').toUpperCase(),
    };

    return Response.json({ ok: true, orderId: orderId || null, result: norm, raw });
  } catch (e) {
    const status = e?.status || 500;
    return Response.json({ error: 'status_error', detail: String(e?.message || e) }, { status });
  }
}