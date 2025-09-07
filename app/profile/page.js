'use client';

import Protected from '../components/Protected';
import NavBar from '../components/NavBar';
import Toast from '../components/Toast';
import { useEffect, useMemo, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import {
  getAuth,
  updateProfile,
  sendEmailVerification,
  updatePassword,
  onAuthStateChanged,
} from 'firebase/auth';

function Avatar({ email, size = 56 }) {
  const letter = (email || '?').slice(0, 1).toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand text-white font-semibold shadow-sm"
      style={{ width: size, height: size }}
    >
      {letter}
    </div>
  );
}

export default function ProfilePage() {
  const [msg, setMsg] = useState({ text: '', type: 'info' });
  const [user, setUser] = useState(null);

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    initFirebase();
    const unsub = onAuthStateChanged(getAuth(), (u) => {
      setUser(u || null);
      if (u?.displayName) setDisplayName(u.displayName);
    });
    return () => unsub();
  }, []);

  const email = user?.email || '';
  const verified = !!user?.emailVerified;

  const nameDirty = useMemo(
    () => (user?.displayName || '') !== (displayName || ''),
    [user?.displayName, displayName]
  );

  const pwStrong = useMemo(() => {
    // simple strength check: 8+ and contains letters+numbers
    const hasLen = pw.length >= 8;
    const hasMix = /[a-zA-Z]/.test(pw) && /\d/.test(pw);
    return hasLen && hasMix;
  }, [pw]);

  // ---- Actions ----
  const saveName = async () => {
    if (!nameDirty) return;
    try {
      setSavingName(true);
      await updateProfile(getAuth().currentUser, { displayName });
      setMsg({ text: 'Profile updated.', type: 'success' });
    } catch (e) {
      setMsg({ text: e.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingName(false);
      setTimeout(() => setMsg({ text: '' }), 1500);
    }
  };

  const resendVerification = async () => {
    try {
      await sendEmailVerification(getAuth().currentUser);
      setMsg({ text: 'Verification email sent.', type: 'success' });
    } catch (e) {
      setMsg({ text: e.message || 'Could not send email', type: 'error' });
    } finally {
      setTimeout(() => setMsg({ text: '' }), 1500);
    }
  };

  const changePassword = async () => {
    if (!pwStrong) {
      setMsg({ text: 'Use 8+ characters with letters and numbers.', type: 'error' });
      setTimeout(() => setMsg({ text: '' }), 1500);
      return;
    }
    try {
      setChangingPw(true);
      await updatePassword(getAuth().currentUser, pw);
      setPw('');
      setMsg({ text: 'Password changed.', type: 'success' });
    } catch (e) {
      setMsg({ text: e.message || 'Could not change password', type: 'error' });
    } finally {
      setChangingPw(false);
      setTimeout(() => setMsg({ text: '' }), 1500);
    }
  };

  return (
    <Protected>
      <NavBar />
      <Toast {...msg} />

      <div className="container max-w-3xl py-8 space-y-8">
        {/* Header card */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <Avatar email={email} />
            <div>
              <h1 className="text-xl font-semibold">Profile</h1>
              <p className="text-sm text-gray-500">
                Manage your account details and security settings.
              </p>
            </div>
          </div>
        </section>

        {/* Identity */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold">Identity</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">Email</label>
              <input
                disabled
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800"
                value={email}
              />
              <div className="text-xs">
                {verified ? (
                  <span className="text-emerald-600">Email is verified</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">Not verified</span>
                    <button className="btn-link text-sm" onClick={resendVerification}>
                      Resend verification
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-500">Display name</label>
              <input
                className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary h-9 disabled:opacity-60"
                  disabled={!nameDirty || savingName}
                  onClick={saveName}
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  className="btn-outline h-9"
                  onClick={() => setDisplayName(user?.displayName || '')}
                  disabled={!nameDirty}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold">Security</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">New password</label>
              <div className="relative">
                <input
                  className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 pr-16 text-sm dark:border-gray-700"
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Use at least 8 characters with letters and numbers.
              </p>
              <button
                className="btn-outline h-9 disabled:opacity-60"
                onClick={changePassword}
                disabled={changingPw || !pwStrong}
                title={!pwStrong ? 'Use 8+ chars incl. letters and numbers' : 'Update password'}
              >
                {changingPw ? 'Updating…' : 'Update password'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-500">Two-Step (coming soon)</label>
              <div className="rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700">
                We’re adding 2-Step Verification for extra security.
              </div>
            </div>
          </div>
        </section>
      </div>
    </Protected>
  );
}