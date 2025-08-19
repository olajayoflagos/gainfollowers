'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bars3Icon, XMarkIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initFirebase } from '@/lib/firebaseClient';

function Avatar({ email }){
  const letter = (email||'?').slice(0,1).toUpperCase();
  return <div className="h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center font-semibold">{letter}</div>;
}

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    initFirebase();
    setDark(document.documentElement.classList.contains('dark'));
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u));
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('click', onDoc);
    return () => { unsub(); document.removeEventListener('click', onDoc); };
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = !html.classList.contains('dark');
    html.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  };
  const logOut = async () => { await signOut(getAuth()); setOpen(false); setMenu(false); window.location.href='/'; };

  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-gray-950/60 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="container h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-wide">Gainfollowers</Link>
        <nav className="hidden md:flex gap-6 text-sm">
          <Link className="hover:text-brand" href="/services">Services</Link>
          <Link className="hover:text-brand" href="/dashboard">Dashboard</Link>
          <Link className="hover:text-brand" href="/admin">Admin</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button className="btn-outline h-9 px-3" onClick={toggleTheme} aria-label="Toggle theme">{dark ? <SunIcon className="h-5 w-5"/> : <MoonIcon className="h-5 w-5"/>}</button>
          {!user ? (<>
            <Link href="/login" className="hidden md:inline-flex btn-outline h-9">Log in</Link>
            <Link href="/signup" className="hidden md:inline-flex btn-primary h-9">Sign up</Link>
          </>) : (
            <div className="relative" ref={menuRef}>
              <button onClick={()=>setMenu(v=>!v)} className="flex items-center gap-2"><Avatar email={user.email}/></button>
              {menu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-1 text-sm">
                  <div className="px-3 py-2 text-gray-500 truncate">{user.email}</div>
                  <Link className="block px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800" href="/dashboard" onClick={()=>setMenu(false)}>Dashboard</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800" href="/profile" onClick={()=>setMenu(false)}>Profile</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800" href="/admin" onClick={()=>setMenu(false)}>Admin</Link>
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800" onClick={logOut}>Log out</button>
                </div>
              )}
            </div>
          )}
          <button className="md:hidden p-2" onClick={()=>setOpen(v=>!v)} aria-label="Menu">{open ? <XMarkIcon className="h-6 w-6"/> : <Bars3Icon className="h-6 w-6"/>}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="container py-3 flex flex-col gap-3">
            <Link onClick={()=>setOpen(false)} href="/services">Services</Link>
            <Link onClick={()=>setOpen(false)} href="/dashboard">Dashboard</Link>
            <Link onClick={()=>setOpen(false)} href="/admin">Admin</Link>
            <div className="flex gap-2">
              {!user ? (<>
                <Link href="/login" className="btn-outline h-9 flex-1" onClick={()=>setOpen(false)}>Log in</Link>
                <Link href="/signup" className="btn-primary h-9 flex-1" onClick={()=>setOpen(false)}>Sign up</Link>
              </>) : (<button className="btn-outline h-9 flex-1" onClick={logOut}>Log out</button>)}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
