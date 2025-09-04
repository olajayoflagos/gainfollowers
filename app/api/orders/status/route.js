import { verifyIdToken, db } from '../../../../lib/firebaseAdmin';
import axios from 'axios';
export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    await verifyIdToken(idToken);
    const { orderId } = await req.json();
    if (!orderId) return Response.json({ error: 'Missing orderId' }, { status: 400 });
    const url = process.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2';
    const { data } = await axios.post(url, new URLSearchParams({ key: process.env.JAP_API_KEY, action:'status', order: String(orderId) }).toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' } });
    return Response.json(data);
  } catch { return Response.json({ error: 'Unable to fetch status' }, { status: 500 }); }
}
