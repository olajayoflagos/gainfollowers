'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaystackCallback() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('verifying');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const ref = sp.get('reference');
    if (!ref) { setStatus('error'); setMsg('Missing reference'); return; }
    (async () => {
      try {
        const res = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref }),
        });
        const j = await res.json();
        if (res.ok && j.ok) {
          setStatus('success');
          setMsg(`Wallet credited: ₦${Number(j.credited || 0).toLocaleString()}`);
          setTimeout(() => router.replace('/dashboard'), 1200);
        } else {
          setStatus('error');
          setMsg(j.error || `Status: ${j.status || 'failed'}`);
        }
      } catch (e) {
        setStatus('error'); setMsg('Verification failed');
      }
    })();
  }, [sp, router]);

  return (
    <div className="container py-16 text-center">
      {status === 'verifying' && <p className="text-gray-600">Verifying your payment…</p>}
      {status === 'success' && <p className="text-emerald-600 font-medium">{msg}</p>}
      {status === 'error' && (
        <>
          <p className="text-red-600 font-medium">Couldn’t verify payment.</p>
          <p className="text-gray-500 mt-2">{msg}</p>
        </>
      )}
      <div className="mt-6">
        <Link className="btn-primary" href="/dashboard">Back to Dashboard</Link>
      </div>
    </div>
  );
}
