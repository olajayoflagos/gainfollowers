export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; export const revalidate = 0;
export async function GET() {
  const has = (k) => Boolean(process.env[k] && process.env[k].length > 5);
  return Response.json({
    FIREBASE_PROJECT_ID: has('FIREBASE_PROJECT_ID'),
    FIREBASE_CLIENT_EMAIL: has('FIREBASE_CLIENT_EMAIL'),
    FIREBASE_PRIVATE_KEY: has('FIREBASE_PRIVATE_KEY'),
    PAYSTACK_SECRET_KEY: has('PAYSTACK_SECRET_KEY'),
    JAP_API_KEY: has('JAP_API_KEY'),
  });
}
