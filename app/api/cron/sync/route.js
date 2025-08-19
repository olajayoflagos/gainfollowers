import axios from 'axios';
import { db } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const urlObj = new URL(req.url);
    const token = urlObj.searchParams.get('token');
    const isCron = !!req.headers.get('x-vercel-cron');
    if (!isCron && token !== process.env.CRON_TOKEN) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sinceISO = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    let q = db.collection('orders').where('createdAt','>=',sinceISO).where('status','in',['created','processing','pending','in progress']).orderBy('createdAt','desc').limit(50);
    const snap = await q.get();
    if (snap.empty) return Response.json({ ok: true, updated: 0 });
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const japUrl = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';
    let updated = 0;
    for (const o of orders) {
      try {
        const { data } = await axios.post(japUrl, new URLSearchParams({ key: process.env.JAP_API_KEY, action:'status', order: String(o.orderId) }).toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' }, timeout: 15000 });
        const newStatus = (data.status || '').toLowerCase();
        const fields = { status: newStatus, start_count: data.start_count, remains: data.remains, charge: data.charge };
        if (newStatus && newStatus !== o.status) {
          await db.collection('orders').doc(o.id).set(fields, { merge: true }); updated++;
          if (['completed','partial','canceled','cancelled','refunded'].includes(newStatus) && o.email) {
            try { await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@localhost', to: o.email, subject: `Order #${o.orderId} — ${newStatus}`, html: `<p>Your order <b>#${o.orderId}</b> is now <b>${newStatus}</b>.</p>` }); } catch {}
          }
        }
      } catch {}
    }
    return Response.json({ ok: true, updated });
  } catch { return Response.json({ error: 'Server error' }, { status: 500 }); }
}
