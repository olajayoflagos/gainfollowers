import { verifyIdToken } from '@/lib/firebaseAdmin';
import axios from 'axios';
export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const user = await verifyIdToken(idToken);
    const { amount } = await req.json();
    if (!amount || amount < 100) return Response.json({ error: 'Min amount ₦100' }, { status: 400 });
    const res = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: user.email, amount: Math.round(Number(amount)) * 100, metadata: { uid: user.uid },
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`
    }, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } });
    return Response.json(res.data.data, { status: 200 });
  } catch { return Response.json({ error: 'Paystack init failed' }, { status: 500 }); }
}
