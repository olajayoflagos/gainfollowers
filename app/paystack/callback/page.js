// app/paystack/callback/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Tiny inline spinner (no dependency)
function Spinner({ label = 'Working…' }) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

// Try to extract reference from multiple places
function extractReference(sp) {
  // 1) Standard query keys
  const q = sp.get('reference') || sp.get('trxref');
  if (q) return q;

  // 2) Hash fragment: #reference=... or #trxref=...
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    if (hash.startsWith('#')) {
      const p = new URLSearchParams(hash.slice(1));
      const hv = p.get('reference') || p.get('trxref');
      if (hv) return hv;
    }

    // 3) Full URL scan (paranoid fallback)
    const m1 = /[?#&]reference=([^&#]+)/i.exec(window.location.href);
    if (m1?.[1]) return decodeURIComponent(m1[1]);
    const m2 = /[?#&]trxref=([^&#]+)/i.exec(window.location.href);
    if (m2?.[1]) return decodeURIComponent(m2[1]);

    // 4) Local/session storage (we saved it on initialize)
    try {
      const ls = localStorage.getItem('ps_ref');
      if (ls) return ls;
    } catch {}
    try {
      const ss = sessionStorage.getItem('ps_ref');
      if (ss) return ss;
    } catch {}
  }
  return '';
}

export default function PaystackCallback() {
  const sp = useSearchParams();
  const router = useRouter();

  const [ref, setRef] = useState('');
  const [status, setStatus] = useState('idle'); // idle | verifying | success | error
  const [msg, setMsg] = useState('');

  // Verify function (re-used by Retry)
  const verify = useCallback(async (reference) => {
    if (!reference) {
      setStatus('error');
      setMsg('Missing reference. If you completed payment, return to Dashboard and check your wallet.');
      return;
    }
    setStatus('verifying');
    setMsg('');
    try {
      const res = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setStatus('success');
        setMsg(`Wallet credited: ₦${Number(j.credited || 0).toLocaleString()}`);
        try { localStorage.removeItem('ps_ref'); } catch {}
        try { sessionStorage.removeItem('ps_ref'); } catch {}
        // small pause so the message is visible
        setTimeout(() => router.replace('/dashboard'), 1200);
      } else {
        setStatus('error');
        setMsg(j?.error ? String(j.error) : `Verification failed (status: ${j?.status || 'unknown'})`);
      }
    } catch (e) {
      setStatus('error');
      setMsg('Network error while verifying payment. Please use Retry.');
    }
  }, [router]);

  useEffect(() => {
    const r = extractReference(sp);
    setRef(r);
    verify(r);
  }, [sp, verify]);

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold">Payment</h1>
        <p className="mt-1 text-sm text-gray-500">Verifying your Paystack transaction…</p>

        <div className="mt-6">
          {status === 'verifying' && <Spinner label="Verifying payment…" />}

          {status === 'success' && (
            <p className="text-emerald-600 font-medium">{msg || 'Success! Redirecting…'}</p>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <p className="text-red-600 font-medium">Couldn’t verify payment.</p>
              <p className="text-sm text-gray-500">{msg}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  className="btn-outline"
                  onClick={() => verify(ref)}
                  disabled={!ref || status === 'verifying'}
                  title={!ref ? 'No reference found' : 'Retry verification'}
                >
                  Retry
                </button>
                <Link className="btn-primary" href="/dashboard">
                  Back to Dashboard
                </Link>
              </div>
              {ref ? (
                <p className="text-xs text-gray-400">Ref: {ref}</p>
              ) : (
                <p className="text-xs text-gray-400">
                  Tip: if you completed payment, your wallet should update within a minute. If not, contact support.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}