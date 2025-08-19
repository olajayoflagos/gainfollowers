import { verifyIdToken, authAdmin } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
export async function POST(req) {
  try {
    const token = (req.headers.get('authorization') || '').split('Bearer ')[1];
    const user = await verifyIdToken(token);
    await authAdmin.updateUser(user.uid, { disabled: true });

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
        subject: `Your account has been deactivated`,
        html: `<p>Your account has been deactivated as requested.</p>`
      });
    } catch {}
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
}
