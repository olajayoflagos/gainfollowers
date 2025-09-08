// app/api/orders/create/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';

function getBearer(req) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : '';
}

async function placeJapOrder({ service, link, quantity }) {
  const form = new URLSearchParams();
  form.set('key', process.env.JAP_API_KEY);
  form.set('action', 'add');
  form.set('service', String(service));
  form.set('link', String(link));
  form.set('quantity', String(quantity));

  const res = await fetch(process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    // cache: 'no-store' // optional
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.order) {
    const msg = data?.error || `JAP order failed (${res.status})`;
    throw new Error(msg);
  }
  return data.order; // JAP order id
}

export async function POST(req) {
  try {
    const idToken = getBearer(req);
    if (!idToken) return Response.json({ error: 'missing_token' }, { status: 401 });

    let user;
    try {
      user = await verifyIdToken(idToken);
    } catch {
      return Response.json({ error: 'invalid_token' }, { status: 401 });
    }

    const { service, link, quantity } = await req.json();
    const qty = Number(quantity || 0);
    if (!service || !link || !qty) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    // ---- Load service rate to price in NGN ----
    const origin = new URL(req.url).origin; // robust in dev/prod
    let svcList = [];
    try {
      const svcRes = await fetch(`${origin}/api/jap/services`, { cache: 'no-store' });
      svcList = await svcRes.json();
    } catch (e) {
      // fall through with empty list; will error below
    }

    const svc = Array.isArray(svcList)
      ? svcList.find((s) => String(s.service) === String(service))
      : null;

    if (!svc) {
      return Response.json({ error: 'unknown_service' }, { status: 400 });
    }

    // optional: enforce min/max server-side
    const min = Number(svc.min || 0);
    const max = Number(svc.max || 0);
    if ((min && qty < min) || (max && qty > max)) {
      return Response.json(
        { error: 'invalid_quantity', min, max },
        { status: 400 }
      );
    }

    const rateUsdPer1k = Number(svc.rate || 0);
    const usdNgn = Number(process.env.USD_NGN_RATE || process.env.NEXT_PUBLIC_USD_NGN_RATE || 1700);
    const margin = Number(process.env.MARGIN_PERCENT || process.env.NEXT_PUBLIC_MARGIN_PERCENT || 20);
    const priceNGN = Math.ceil((rateUsdPer1k * (qty / 1000)) * usdNgn * (1 + margin / 100));

    // ---- Atomically reserve funds & create order shell ----
    const { orderId, balanceAfter } = await db()
      .runTransaction(async (tx) => {
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
          createdAt: new Date().toISOString(),
        });

        // record debit
        tx.set(db().collection('wallet_debits').doc(orderRef.id), {
          uid: user.uid,
          orderId: orderRef.id,
          amountNGN: priceNGN,
          title: `Order ${orderRef.id}`,
          type: 'debit',
          createdAt: new Date().toISOString(),
        });

        // ✅ return names that match what we’ll destructure later
        return { orderId: orderRef.id, balanceAfter: newBal };
      })
      .catch((e) => {
        if (e?.code === 'insufficient_funds' || e?.message === 'insufficient_funds') {
          throw Object.assign(new Error('insufficient_funds'), { status: 400 });
        }
        throw e;
      });

    // ---- Place the JAP order (outside txn) ----
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
          refundedAt: new Date().toISOString(),
        }, { merge: true });

        tx.set(db().collection('orders').doc(orderId), {
          status: 'failed',
          error: String(e?.message || e),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      return Response.json(
        { error: 'jap_failed', detail: String(e?.message || e) },
        { status: 502 }
      );
    }

    // ---- Mark order as placed ----
    await db().collection('orders').doc(orderId).set(
      {
        status: 'pending',
        japOrderId: String(japOrderId),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return Response.json({
      ok: true,
      orderId,
      japOrderId,
      priceNGN,
      balanceAfter,
    });
  } catch (e) {
    console.error('orders/create error:', e);
    const status = e?.status || 500;
    return Response.json(
      { error: 'server_error', detail: String(e?.message || e) },
      { status }
    );
  }
}