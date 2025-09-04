export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';
import axios from 'axios';

export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);
    const { service, link, quantity } = await req.json();
    if (!service || !link || !quantity) return Response.json({ error: 'Missing fields' }, { status: 400 });

    const walletRef = db().collection('wallets').doc(user.uid);
    const walletSnap = await walletRef.get();
    const balance = walletSnap.exists ? walletSnap.data().balance || 0 : 0;

    const rate = Number(process.env.USD_NGN_RATE || process.env.NEXT_PUBLIC_USD_NGN_RATE || 1600);
    const margin = Number(process.env.MARGIN_PERCENT || process.env.NEXT_PUBLIC_MARGIN_PERCENT || 20);
    const japUrl = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';

    const svcRes = await axios.post(
      japUrl,
      new URLSearchParams({ key: process.env.JAP_API_KEY, action: 'services' }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const svc = Array.isArray(svcRes.data) ? svcRes.data.find(s => String(s.service) === String(service)) : null;
    if (!svc) return Response.json({ error: 'Service not found' }, { status: 404 });

    const usdPer1k = Number(svc.rate);
    const priceNGN = Math.ceil((usdPer1k * (Number(quantity)/1000)) * rate * (1 + margin/100));
    if (balance < priceNGN) return Response.json({ error: 'Insufficient wallet balance' }, { status: 402 });

    // Hold funds (deduct first)
    await walletRef.set({ balance: balance - priceNGN }, { merge: true });

    // Place JAP order
    const orderRes = await axios.post(
      japUrl,
      new URLSearchParams({
        key: process.env.JAP_API_KEY,
        action: 'add',
        service: String(service),
        link,
        quantity: String(quantity)
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    const orderId = orderRes?.data?.order;
    if (!orderId) {
      // refund if JAP failed
      await walletRef.set({ balance }, { merge: true });
      return Response.json({ error: 'JAP order failed', detail: orderRes.data }, { status: 502 });
    }

    const now = new Date().toISOString();

    // Save order
    await db().collection('orders').doc(`${user.uid}_${orderId}`).set({
      uid: user.uid,
      email: user.email || null,
      orderId,
      service: Number(service),
      link,
      quantity: Number(quantity),
      priceNGN,
      createdAt: now,
      status: 'created'
    });

    // Record debit for history
    await db().collection('wallet_debits').doc(`ORD_${orderId}`).set({
      uid: user.uid,
      orderId,
      amountNGN: priceNGN,
      createdAt: now,
      source: 'order'
    });

    return Response.json({ ok: true, orderId });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
