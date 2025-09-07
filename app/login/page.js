'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';

import NavBar from '../components/NavBar';
import Toast from '../components/Toast';
import { initFirebase } from '@/lib/firebaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'info' });
  const router = useRouter();

  useEffect(() => initFirebase(), []);

  const afterAuthInit = async (idToken) => {
    // initialize user/wallet doc just in case (idempotent on server)
    try {
      await fetch('/api/user/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: 'info' });
    try {
      setBusy(true);
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      const token = await cred.user.getIdToken(true);
      await afterAuthInit(token);
      router.push('/dashboard');
    } catch (e) {
      setMsg({ text: e?.message || 'Login failed.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setMsg({ text: '', type: 'info' });
    try {
      setBusy(true);
      const auth = getAuth();
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await user.getIdToken(true);
      await afterAuthInit(token);
      router.push('/dashboard');
    } catch (e) {
      setMsg({ text: e?.message || 'Google sign-in failed.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return setMsg({ text: 'Enter your email above, then tap “Forgot password”.', type: 'error' });
    }
    try {
      await sendPasswordResetEmail(getAuth(), email);
      setMsg({ text: 'Password reset link sent. Check your inbox.', type: 'success' });
    } catch (e) {
      setMsg({ text: e?.message || 'Could not send reset email.', type: 'error' });
    }
  };

  return (
    <>
      <NavBar />
      <Toast {...msg} />

      {/* background accents */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-violet-100 via-white to-white dark:from-violet-950/40 dark:via-gray-950 dark:to-gray-950" />
        <div className="pointer-events-none absolute right-[-60px] top-10 -z-10 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-700/20" />
      </div>

      <main className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log in</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Welcome back! Access your NGN wallet and orders dashboard.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
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
                    placeholder="Your password"
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
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={forgot}
                    className="text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'Log in'}
              </button>

              <div className="relative my-2 text-center text-xs text-gray-500 dark:text-gray-400">
                <span className="bg-white px-2 dark:bg-gray-900">or</span>
                <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/google.svg" alt="" width="18" height="18" />
                Continue with Google
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
              <span>New to Gainfollowers?</span>
              <a href="/signup" className="font-semibold text-violet-700 hover:underline dark:text-violet-300">
                Create account
              </a>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-md text-center text-xs text-gray-500 dark:text-gray-400">
            Secured by Paystack • Google Sign-In available • Works great on mobile
          </div>
        </div>
      </main>
    </>
  );
}