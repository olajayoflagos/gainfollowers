// app/api/orders/create/route.js
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

async function placeJapOrder({ service, link, quantity }) {
  if (!process.env.JAP_API_KEY) {
    const e = new Error('JAP_API_KEY missing'); e.status = 500; throw e;
  }
  const url = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';

  const form = new URLSearchParams();
  form.set('key', process.env.JAP_API_KEY);
  form.set('action', 'add');
  form.set('service', String(service));
  form.set('link', String(link));
  form.set('quantity', String(quantity));

  // 20s timeout
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 20_000);

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

  if (!res.ok || !data?.order) {
    const msg = (data && (data.error || data.message)) || text || `JAP order failed (${res.status})`;
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }
  return data.order;
}

export async function POST(req) {
  try {
    // Auth
    const idToken = getBearer(req);
    if (!idToken) return Response.json({ error: 'missing_token' }, { status: 401 });

    let user;
    try { user = await verifyIdToken(idToken); }
    catch { return Response.json({ error: 'invalid_token' }, { status: 401 }); }

    // Input
    const { service, link, quantity } = await req.json();
    const qty = Number(quantity || 0);
    if (!service || !link || !qty) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    // Service & pricing
    const origin = new URL(req.url).origin;
    let svcList = [];
    try {
      const svcRes = await fetch(`${origin}/api/jap/services`, { cache: 'no-store' });
      if (svcRes.ok) svcList = await svcRes.json();
    } catch {}

    const svc = Array.isArray(svcList)
      ? svcList.find(s => String(s.service) === String(service))
      : null;

    if (!svc) return Response.json({ error: 'unknown_service' }, { status: 400 });

    const min = Number(svc.min || 0);
    const max = Number(svc.max || 0);
    if ((min && qty < min) || (max && qty > max)) {
      return Response.json({ error: 'invalid_quantity', min, max }, { status: 400 });
    }

    const rateUsdPer1k = Number(svc.rate || 0);
    if (!rateUsdPer1k) return Response.json({ error: 'bad_service_rate' }, { status: 400 });

    const usdNgn = Number(process.env.USD_NGN_RATE || process.env.NEXT_PUBLIC_USD_NGN_RATE || 1700);
    const margin = Number(process.env.MARGIN_PERCENT || process.env.NEXT_PUBLIC_MARGIN_PERCENT || 20);
    const priceNGN = Math.ceil((rateUsdPer1k * (qty / 1000)) * usdNgn * (1 + margin / 100));

    // Reserve funds & create order with server timestamps
    const { orderId, balanceAfter } = await db().runTransaction(async (tx) => {
      const walletRef = db().collection('wallets').doc(user.uid);
      const wSnap = await tx.get(walletRef);
      const balance = wSnap.exists ? Number(wSnap.data().balance || 0) : 0;

      if (balance < priceNGN) {
        throw Object.assign(new Error('insufficient_funds'), { code: 'insufficient_funds' });
      }

      const newBal = balance - priceNGN;
      tx.set(walletRef, { balance: newBal }, { merge: true });

      const orderRef = db().collection('orders').doc();
      tx.set(orderRef, {
        uid: user.uid,
        service: String(service),
        link: String(link),
        quantity: qty,
        priceNGN,
        status: 'creating',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(db().collection('wallet_debits').doc(orderRef.id), {
        uid: user.uid,
        orderId: orderRef.id,
        amountNGN: priceNGN,
        title: `Order ${orderRef.id}`,
        type: 'debit',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { orderId: orderRef.id, balanceAfter: newBal };
    }).catch((e) => {
      if (e?.code === 'insufficient_funds' || e?.message === 'insufficient_funds') {
        throw Object.assign(new Error('insufficient_funds'), { status: 400 });
      }
      throw e;
    });

    // Provider call
    let japOrderId;
    try {
      japOrderId = await placeJapOrder({ service, link, quantity: qty });
    } catch (e) {
      // refund on failure
      await db().runTransaction(async (tx) => {
        const walletRef = db().collection('wallets').doc(user.uid);
        const wSnap = await tx.get(walletRef);
        const bal = wSnap.exists ? Number(wSnap.data().balance || 0) : 0;
        tx.set(walletRef, { balance: bal + priceNGN }, { merge: true });

        tx.set(db().collection('wallet_debits').doc(orderId), {
          refunded: true,
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(db().collection('orders').doc(orderId), {
          status: 'failed',
          error: String(e?.message || e),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      return Response.json({ error: 'jap_failed', detail: String(e?.message || e) }, { status: e.status || 502 });
    }

    // Mark success
    await db().collection('orders').doc(orderId).set({
      status: 'pending',
      japOrderId: String(japOrderId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return Response.json({ ok: true, orderId, japOrderId, priceNGN, balanceAfter });
  } catch (e) {
    console.error('orders/create error:', e);
    const status = e?.status || 500;
    return Response.json({ error: 'server_error', detail: String(e?.message || e) }, { status });
  }
}