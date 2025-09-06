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
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.order) {
    const msg = data?.error || 'JAP order failed';
    throw new Error(msg);
  }
  return data.order; // JAP order id
}

export async function POST(req) {
  try {
    const idToken = getBearer(req);
    if (!idToken) return Response.json({ error: 'missing_token' }, { status: 401 });

    let user;
    try { user = await verifyIdToken(idToken); }
    catch { return Response.json({ error: 'invalid_token' }, { status: 401 }); }

    const { service, link, quantity } = await req.json();
    const qty = Number(quantity || 0);
    if (!service || !link || !qty) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    // fetch services to compute price (or you can trust client estimate)
    // here we read the rate from a cached collection if you store it; otherwise, hit JAP services
    const svcRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/jap/services`, { cache: 'no-store' });
    const svcList = await svcRes.json().catch(() => []);
    const svc = Array.isArray(svcList) ? svcList.find(s => String(s.service) === String(service)) : null;
    const rateUsdPer1k = Number(svc?.rate || 0);
    const rate = Number(process.env.USD_NGN_RATE || 1700);
    const margin = Number(process.env.MARGIN_PERCENT || 20);
    const priceNGN = Math.ceil((rateUsdPer1k * (qty / 1000)) * rate * (1 + margin / 100));

    // atomically ensure wallet >= price and reserve funds
    const { orderId, currentBalance } = await db().runTransaction(async (tx) => {
      const walletRef = db().collection('wallets').doc(user.uid);
      const wSnap = await tx.get(walletRef);
      const balance = wSnap.exists ? Number(wSnap.data().balance || 0) : 0;

      if (balance < priceNGN) {
        // abort transaction early
        throw Object.assign(new Error('insufficient_funds'), { code: 'insufficient_funds' });
      }

      // place JAP order outside the transaction? That risks race. We’ll reserve first, place, then confirm.
      const newBal = balance - priceNGN;
      tx.set(walletRef, { balance: newBal }, { merge: true });

      // create a pending order doc with a temp id
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
      const debitRef = db().collection('wallet_debits').doc(orderRef.id);
      tx.set(debitRef, {
        uid: user.uid,
        orderId: orderRef.id,
        amountNGN: priceNGN,
        createdAt: new Date().toISOString(),
      });

      return { orderDocId: orderRef.id, currentBalance: newBal };
    }).catch((e) => {
      if (e?.code === 'insufficient_funds' || e?.message === 'insufficient_funds') {
        throw Object.assign(new Error('insufficient_funds'), { status: 400 });
      }
      throw e;
    });

    // Now place the JAP order (outside the transaction)
    let japOrderId;
    try {
      japOrderId = await placeJapOrder({ service, link, quantity: qty });
    } catch (e) {
      // if JAP failed, refund the user and mark order as failed
      await db().runTransaction(async (tx) => {
        const walletRef = db().collection('wallets').doc(user.uid);
        const wSnap = await tx.get(walletRef);
        const balance = wSnap.exists ? Number(wSnap.data().balance || 0) : 0;
        tx.set(walletRef, { balance: balance + priceNGN }, { merge: true });

        // revert debit record (mark as refunded)
        const debitRef = db().collection('wallet_debits').doc(orderId);
        tx.set(debitRef, { refunded: true, refundedAt: new Date().toISOString() }, { merge: true });

        const orderRef = db().collection('orders').doc(orderId);
        tx.set(orderRef, { status: 'failed', error: String(e?.message || e) }, { merge: true });
      });
      return Response.json({ error: 'jap_failed', detail: String(e?.message || e) }, { status: 502 });
    }

    // Mark order as placed
    await db().collection('orders').doc(orderId).set({
      status: 'pending',
      japOrderId: String(japOrderId),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return Response.json({ ok: true, orderId, priceNGN, japOrderId, balanceAfter: currentBalance });
  } catch (e) {
    const status = e?.status || 500;
    return Response.json({ error: 'server_error', detail: String(e?.message || e) }, { status });
  }
}
