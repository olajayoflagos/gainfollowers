'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

import NavBar from '../components/NavBar';
import Toast from '../components/Toast';
import { initFirebase } from '@/lib/firebaseClient';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'info' });
  const router = useRouter();

  useEffect(() => initFirebase(), []);

  // simple strength estimator
  const pwStrength = useMemo(() => {
    let s = 0;
    if (pw.length >= 8) s += 1;
    if (/[A-Z]/.test(pw)) s += 1;
    if (/[0-9]/.test(pw)) s += 1;
    if (/[^A-Za-z0-9]/.test(pw)) s += 1;
    return s; // 0..4
  }, [pw]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: 'info' });

    // quick client-side checks
    if (!name.trim()) return setMsg({ text: 'Please enter your full name.', type: 'error' });
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return setMsg({ text: 'Enter a valid email address.', type: 'error' });
    }
    if (pwStrength < 2) {
      return setMsg({ text: 'Use at least 8 chars with letters & numbers.', type: 'error' });
    }

    try {
      setBusy(true);
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      if (name) await updateProfile(cred.user, { displayName: name });

      // optional welcome email (non-blocking)
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name }),
        });
      } catch {}

      // initialize user/wallet
      const token = await cred.user.getIdToken();
      await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });

      setMsg({ text: 'Account created! Redirecting…', type: 'success' });
      router.push('/dashboard');
    } catch (e) {
      const t =
        e?.code === 'auth/email-already-in-use'
          ? 'This email already has an account. Try logging in.'
          : e?.message || 'Sign up failed.';
      setMsg({ text: t, type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <NavBar />
      <Toast {...msg} />

      {/* background */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-violet-100 via-white to-white dark:from-violet-950/40 dark:via-gray-950 dark:to-gray-950" />
        <div className="pointer-events-none absolute -left-28 top-10 -z-10 h-72 w-72 rounded-full bg-fuchsia-300/40 blur-3xl dark:bg-fuchsia-700/20" />
      </div>

      <main className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gainfollowers-logo.svg"
                alt="Gainfollowers"
                width="48"
                height="48"
                className="mx-auto mb-2 rounded-xl"
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Join Gainfollowers to grow on Instagram, TikTok, X (Twitter) & Facebook.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full name
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-violet-700/30"
                  placeholder="e.g. Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-violet-700/30"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-12 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-violet-700/30"
                    placeholder="Minimum 8 characters"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* strength bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className={[
                      'h-full transition-all',
                      pwStrength === 0 && 'w-0',
                      pwStrength === 1 && 'w-1/4 bg-red-500',
                      pwStrength === 2 && 'w-2/4 bg-orange-500',
                      pwStrength === 3 && 'w-3/4 bg-amber-500',
                      pwStrength >= 4 && 'w-full bg-emerald-500',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Use at least 8 characters including numbers or symbols.
                </p>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
              >
                {busy ? 'Creating account…' : 'Sign up'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="font-medium text-violet-700 hover:underline dark:text-violet-300">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" className="font-medium text-violet-700 hover:underline dark:text-violet-300">
                Privacy Policy
              </a>
              .
            </p>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
              <span>Already have an account?</span>
              <a
                href="/login"
                className="font-semibold text-violet-700 hover:underline dark:text-violet-300"
              >
                Log in
              </a>
            </div>
          </div>

          {/* tiny trust row */}
          <div className="mx-auto mt-6 max-w-md text-center text-xs text-gray-500 dark:text-gray-400">
            Secured by Paystack • Works great on mobile • Instant NGN wallet
          </div>
        </div>
      </main>
    </>
  );
}