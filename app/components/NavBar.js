'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bars3Icon, XMarkIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initFirebase } from '@/lib/firebaseClient';

function Avatar({ email }) {
  const letter = (email || '?').slice(0, 1).toUpperCase();
  return (
    <div
      className="inline-flex h-8 w-8 select-none items-center justify-center rounded-full bg-brand text-white shadow-sm"
      aria-hidden="true"
    >
      <span className="text-sm font-semibold">{letter}</span>
    </div>
  );
}

export default function NavBar() {
  const [open, setOpen] = useState(false);     // mobile menu
  const [menu, setMenu] = useState(false);     // avatar dropdown
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(null);

  const menuRef = useRef(null);
  const burgerRef = useRef(null);

  // --- Boot: Firebase auth + theme
  useEffect(() => {
    initFirebase();
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u));

    // load preferred theme (localStorage -> system)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const shouldDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', shouldDark);
    setDark(shouldDark);

    // click-away
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    // Escape closes menus
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenu(false);
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);

    return () => {
      unsub();
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = !html.classList.contains('dark');
    html.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  };

  const logOut = async () => {
    await signOut(getAuth());
    setOpen(false);
    setMenu(false);
    window.location.href = '/';
  };

  const NavLinks = ({ onClick }) => (
    <>
      <Link className="nav-link" href="/services" onClick={onClick}>
        Services
      </Link>
      <Link className="nav-link" href="/dashboard" onClick={onClick}>
        Dashboard
      </Link>
      <Link className="nav-link" href="/admin" onClick={onClick}>
        Admin
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/70 backdrop-blur dark:border-gray-800 dark:bg-gray-950/60">
      <div className="container flex h-14 items-center justify-between">
        {/* Brand */}
        <Link href="/" className="group inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gainfollowers-logo.svg"
            alt="Gainfollowers"
            width="28"
            height="28"
            className="rounded-md"
          />
          <span className="font-semibold tracking-wide group-hover:text-brand">Gainfollowers</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <NavLinks />
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <button
            className="btn-outline h-9 px-3"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={dark ? 'Switch to light' : 'Switch to dark'}
          >
            {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>

          {!user ? (
            <>
              <Link href="/login" className="btn-outline h-9 hidden md:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary h-9 hidden md:inline-flex">
                Sign up
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label="Account menu"
              >
                <Avatar email={user.email} />
              </button>

              {menu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="px-3 py-2 text-xs text-gray-500">
                    {user.email || 'Signed in'}
                  </div>
                  <Link
                    role="menuitem"
                    href="/dashboard"
                    className="menu-item"
                    onClick={() => setMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    role="menuitem"
                    href="/profile"
                    className="menu-item"
                    onClick={() => setMenu(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    role="menuitem"
                    href="/admin"
                    className="menu-item"
                    onClick={() => setMenu(false)}
                  >
                    Admin
                  </Link>
                  <button role="menuitem" className="menu-item w-full text-left" onClick={logOut}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Burger */}
          <button
            ref={burgerRef}
            className="p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="container flex flex-col gap-3 py-3">
            <NavLinks onClick={() => setOpen(false)} />
            <div className="flex gap-2">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="btn-outline h-9 flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-primary h-9 flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <button className="btn-outline h-9 flex-1" onClick={logOut}>
                  Log out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}