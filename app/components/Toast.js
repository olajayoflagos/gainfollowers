'use client';
import { useEffect, useState } from 'react';
export default function Toast({ text, type='info', duration=3500 }) {
  const [show, setShow] = useState(Boolean(text));
  useEffect(()=>{ if (text) { setShow(true); const id=setTimeout(()=>setShow(false), duration); return ()=>clearTimeout(id);} },[text,duration]);
  if (!show) return null;
  const color = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-gray-800';
  return (<div className="fixed top-4 right-4 z-50"><div className={`text-white px-4 py-2 rounded-md shadow-lg ${color}`}>{text}</div></div>);
}
