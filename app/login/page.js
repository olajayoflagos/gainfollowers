'use client';
import NavBar from '../components/NavBar';
import Toast from '../components/Toast';
import { useEffect, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState({ text:'', type:'info' });
  const router = useRouter();
  useEffect(() => initFirebase(), []);
  const submit = async (e) => { e.preventDefault(); setMsg({text:'',type:'info'});
    try { const cred = await signInWithEmailAndPassword(getAuth(), email, pw); if (!cred.user.emailVerified) return setMsg({text:'Please verify your email first.', type:'error'}); router.push('/dashboard'); } catch (e) { setMsg({text:e.message, type:'error'}); } };
  const google = async () => { try { await signInWithPopup(getAuth(), new GoogleAuthProvider()); router.push('/dashboard'); } catch (e) { setMsg({text:e.message, type:'error'});} };
  const forgot = async () => { if(!email) return setMsg({text:'Enter your email first.', type:'error'});
    try{ await sendPasswordResetEmail(getAuth(), email); setMsg({text:'Password reset email sent.', type:'success'});}catch(e){ setMsg({text:e.message, type:'error'});} };
  return (<>
    <NavBar/><Toast {...msg} />
    <div className="container max-w-md py-10">
      <h3 className="text-2xl font-bold mb-4">Log in</h3>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <div className="relative">
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 pr-10" type={show?'text':'password'} placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} required/>
          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500" onClick={()=>setShow(s=>!s)}>{show?'Hide':'Show'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="submit">Log in</button>
          <button className="btn-outline" onClick={google} type="button">Continue with Google</button>
          <button className="btn-link" onClick={forgot} type="button">Forgot password?</button>
        </div>
      </form>
    </div>
  </>);
}
