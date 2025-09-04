'use client';
import NavBar from '../components/NavBar';
import Toast from '../components/Toast';
import { useEffect, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState({ text:'', type:'info' });
  const router = useRouter();
  useEffect(() => initFirebase(), []);

  const submit = async (e) => {
    e.preventDefault(); setMsg({text:'',type:'info'});
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(), email, pw);
      if (name) await updateProfile(cred.user, { displayName: name });

      // optional: still send welcome email
      try { await fetch('/api/email/welcome', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, name }) }); } catch {}

      // initialize user + wallet docs
      const token = await cred.user.getIdToken();
      await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name })
      });

      setMsg({ text: 'Account created!', type: 'success' });
      router.push('/dashboard');
    } catch (e) {
      const t = e.code === 'auth/email-already-in-use'
        ? 'This email already has an account. Try logging in.'
        : e.message;
      setMsg({ text: t, type: 'error' });
    }
  };

  return (
    <>
      <NavBar/><Toast {...msg} />
      <div className="container max-w-md py-10">
        <h3 className="text-2xl font-bold mb-4">Create your account</h3>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required/>
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <div className="relative">
            <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 pr-10" type={show?'text':'password'} placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} required/>
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500" onClick={()=>setShow(s=>!s)}>{show?'Hide':'Show'}</button>
          </div>
          <button className="btn-primary" type="submit">Sign up</button>
        </form>
      </div>
    </>
  );
}
