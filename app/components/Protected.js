'use client';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initFirebase } from '@/lib/firebaseClient';
import Spinner from './Spinner';

export default function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    initFirebase();
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/login');
      else setReady(true);
    });
    return () => unsub();
  }, [router]);
  if (!ready) return <Spinner label="Checking session…" />;
  return children;
}
