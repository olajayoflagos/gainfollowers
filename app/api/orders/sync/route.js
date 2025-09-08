// app/api/orders/sync/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import admin from 'firebase-admin';
import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

function getBearer(req) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : '';
}

async function fetchJapStatus(japOrderId) {
  const url = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';
  const form = new URLSearchParams();
  form.set('key', process.env.JAP_API_KEY || '');
  form.set('action', 'status');
  form.set('order', String(japOrderId));

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
  } finally { clearTimeout(t); }

  if (!res.ok || !data) {
    const msg = (data && (data.error || data.message)) || text || `JAP status failed (${res.status})`;
    const err = new Error(msg); err.status = 502; throw err;
  }
  return data;
}

function mapStatus(raw) {
  const s = String(raw.status || raw.Status || '').toLowerCase();

  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('partial')) return 'partial';
  if (s.includes('progress') || s.includes('process')) return 'processing';

  // If remains is 0, treat as completed even if status text is odd
  const remains = Number(raw.remains ?? raw.Remains ?? 0);
  if (!Number.isNaN(remains) && remains <= 0) return 'completed';

  return 'pending';
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
      return Response.json({ error: 'missing_params' }, { status: 400 });
    }

    // ---- Resolve local order + provider id, verify ownership ----
    let targetJapId = japOrderId;
    let targetLocalId = orderId;

    if (!targetJapId) {
      const snap = await db().collection('orders').doc(String(orderId)).get();
      if (!snap.exists) return Response.json({ error: 'order_not_found' }, { status: 404 });
      const doc = snap.data();
      if (doc.uid !== user.uid) return Response.json({ error: 'forbidden' }, { status: 403 });
      if (!doc.japOrderId) return Response.json({ error: 'order_not_placed_yet' }, { status: 409 });
      targetJapId = String(doc.japOrderId);
      targetLocalId = snap.id;
    } else if (!targetLocalId) {
      // If only JAP id is provided, find the local doc for this user
      const q = await db()
        .collection('orders')
        .where('uid', '==', user.uid)
        .where('japOrderId', '==', String(targetJapId))
        .limit(1)
        .get();
      if (!q.empty) targetLocalId = q.docs[0].id;
    }

    // ---- Call provider ----
    const raw = await fetchJapStatus(targetJapId);
    const status = mapStatus(raw);

    const update = {
      status,
      remains: Number(raw.remains ?? raw.Remains ?? 0),
      charge: Number(raw.charge ?? raw.Charge ?? 0),
      start_count: Number(raw.start_count ?? raw['start_count'] ?? 0),
      providerStatus: raw.status || raw.Status || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (targetLocalId) {
      await db().collection('orders').doc(targetLocalId).set(update, { merge: true });
    }

    return Response.json({
      ok: true,
      orderId: targetLocalId || null,
      japOrderId: targetJapId,
      status,
      raw,
    });
  } catch (e) {
    const status = e?.status || 500;
    return Response.json({ error: 'sync_error', detail: String(e?.message || e) }, { status });
  }
}