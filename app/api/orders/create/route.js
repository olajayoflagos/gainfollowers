import { verifyIdToken } from '@/lib/firebaseAdmin';
import axios from 'axios';
import { db } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);
    const { service, link, quantity } = await req.json();
    if (!service || !link || !quantity) return Response.json({ error: 'Missing fields' }, { status: 400 });

    const walletRef = db.collection('wallets').doc(user.uid);
    const walletSnap = await walletRef.get();
    const balance = walletSnap.exists ? walletSnap.data().balance || 0 : 0;

    const rate = Number(process.env.USD_NGN_RATE || 1600);
    const margin = Number(process.env.MARGIN_PERCENT || 20);
    const japUrl = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';
    const svcRes = await axios.post(japUrl, new URLSearchParams({ key: process.env.JAP_API_KEY, action: 'services' }).toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' } });
    const svc = svcRes.data.find(s => String(s.service) === String(service));
    if (!svc) return Response.json({ error: 'Service not found' }, { status: 404 });

    const usdPer1k = Number(svc.rate);
    const priceNGN = Math.ceil((usdPer1k * (Number(quantity)/1000)) * rate * (1 + margin/100));
    if (balance < priceNGN) return Response.json({ error: 'Insufficient wallet balance' }, { status: 402 });

    await walletRef.set({ balance: balance - priceNGN }, { merge: true });
    const orderRes = await axios.post(japUrl, new URLSearchParams({
      key: process.env.JAP_API_KEY, action: 'add', service: String(service), link, quantity: String(quantity)
    }).toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' }, timeout: 15000 });

    if (!orderRes.data?.order) {
      await walletRef.set({ balance }, { merge: true });
      return Response.json({ error: 'JAP order failed', detail: orderRes.data }, { status: 502 });
    }

    const orderId = orderRes.data.order;
    await db.collection('orders').doc(`${user.uid}_${orderId}`).set({
      uid: user.uid, email: user.email || null, orderId,
      service: Number(service), link, quantity: Number(quantity),
      priceNGN, createdAt: new Date().toISOString(), status: 'created'
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@localhost',
        to: user.email,
        subject: `Your order was placed — #${orderId}`,
        html: `<p>Your order <b>#${orderId}</b> was placed successfully.</p>`
      });
    } catch {}

    return Response.json({ ok: true, orderId });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
