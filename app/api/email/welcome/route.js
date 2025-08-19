import nodemailer from 'nodemailer';
export async function POST(req) {
  try {
    const { email, name } = await req.json();
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@localhost',
      to: email,
      subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME || 'Gainfollowers'}`,
      html: `<p>Hi ${name || ''}, welcome! Please verify your email via the link we sent.</p>`
    });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Failed to send' }, { status: 500 }); }
}
