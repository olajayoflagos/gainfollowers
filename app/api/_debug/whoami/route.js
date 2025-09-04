export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; export const revalidate = 0;
import { verifyIdToken } from '../../../../lib/firebaseAdmin';
export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const idToken = auth.split('Bearer ')[1];
    const u = await verifyIdToken(idToken);
    return Response.json({ ok: true, uid: u.uid, email: u.email, email_verified: u.email_verified });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.code || e?.message || e) }, { status: 401 });
  }
}
