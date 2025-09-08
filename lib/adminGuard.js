// lib/adminGuard.js
import { verifyIdToken, authAdmin } from '@/lib/firebaseAdmin';

/**
 * Reads the Bearer token from the request, verifies it, and enforces admin access.
 * Admin = users with the custom claim { admin: true } OR whose email is in an allowlist.
 * Throws on failure so callers can 401/403.
 */
export async function assertAdmin(req) {
  const auth =
    req.headers.get('authorization') ||
    req.headers.get('Authorization') ||
    '';

  const m = auth.match(/Bearer\s+(.+)/i);
  if (!m) throw new Error('Missing Authorization header');

  let decoded;
  try {
    decoded = await verifyIdToken(m[1]);
  } catch {
    throw new Error('Invalid or expired token');
  }

  // Option A: custom claim set via Firebase Admin SDK
  if (decoded.admin === true) return decoded;

  // Option B: fallback allowlist via env (comma-separated emails)
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  if (decoded.email && allowlist.includes(decoded.email.toLowerCase())) {
    return decoded;
  }

  // Optional: also allow by UID list (comma-separated)
  const uidAllow = (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (uidAllow.includes(decoded.uid)) return decoded;

  throw new Error('Not authorized (admin only)');
}