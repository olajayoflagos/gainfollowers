import crypto from 'crypto';
import { db } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
export const dynamic = 'force-dynamic';
export async function POST(req) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (hash !== signature) return new Response('Invalid signature', { status: 401 });
  const event = JSON.parse(rawBody);
  if (event.event === 'charge.success') {
    const data = event.data; const uid = data.metadata?.uid; const amountNGN = data.amount/100;
    if (uid) {
      const walletRef = db.collection('wallets').doc(uid);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(walletRef);
        const prev = snap.exists ? (snap.data().balance || 0) : 0;
        tx.set(walletRef, { balance: prev + amountNGN }, { merge: true });
      });
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || 'false') === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@localhost',
          to: data.customer.email,
          subject: `Payment received — ₦${amountNGN.toLocaleString()}`,
          html: `<p>Thanks for your payment of <b>₦${amountNGN.toLocaleString()}</b>. Your wallet has been credited.</p><p>Ref: ${data.reference}</p>`
        });
      } catch {}
    }
  }
  return Response.json({ received: true });
}
