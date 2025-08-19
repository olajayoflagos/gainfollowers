'use client';
import Protected from '../components/Protected';
import NavBar from '../components/NavBar';
import Toast from '../components/Toast';
import { useEffect, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import { getAuth, updateProfile, sendEmailVerification, updatePassword } from 'firebase/auth';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState({ text:'', type:'info' });

  useEffect(()=>{
    initFirebase();
    const u = getAuth().currentUser;
    if (u?.displayName) setName(u.displayName);
  },[]);

  const save = async () => {
    try { await updateProfile(getAuth().currentUser, { displayName: name }); setMsg({ text:'Profile updated.', type:'success' }); }
    catch (e) { setMsg({ text:e.message, type:'error' }); }
  };
  const changePw = async () => {
    try { await updatePassword(getAuth().currentUser, pw); setMsg({ text:'Password changed.', type:'success' }); setPw(''); }
    catch (e) { setMsg({ text:e.message, type:'error' }); }
  };
  const resend = async () => {
    try { await sendEmailVerification(getAuth().currentUser); setMsg({ text:'Verification email sent.', type:'success' }); }
    catch (e) { setMsg({ text:e.message, type:'error' }); }
  };

  return (
    <Protected>
      <NavBar/><Toast {...msg}/>
      <div className="container max-w-xl py-10 space-y-8">
        <section className="card p-6">
          <h3 className="font-semibold">Profile</h3>
          <div className="mt-3 space-y-3">
            <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" placeholder="Display name" value={name} onChange={e=>setName(e.target.value)}/>
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </section>
        <section className="card p-6">
          <h3 className="font-semibold">Email verification</h3>
          <p className="text-sm text-gray-500">Didn’t get it?</p>
          <button className="btn-outline mt-3" onClick={resend}>Resend verification email</button>
        </section>
        <section className="card p-6">
          <h3 className="font-semibold">Change password</h3>
          <div className="mt-3 space-y-3">
            <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" type="password" placeholder="New password" value={pw} onChange={e=>setPw(e.target.value)}/>
            <button className="btn-outline" onClick={changePw}>Update password</button>
          </div>
        </section>
      </div>
    </Protected>
  );
}
