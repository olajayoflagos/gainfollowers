// app/dashboard/page.js
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initFirebase } from '../../lib/firebaseClient';
import NavBar from '../components/NavBar';
import WhatsAppButton from '../components/WhatsAppButton';

function Spinner({ label = 'Loading…' }) {
  return (
    <div className="container py-12 text-center">
      <div className="inline-flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
    </div>
  );
}
function Toast({ text, type }) {
  if (!text) return null;
  const base = 'fixed z-30 bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 shadow-lg';
  const tone =
    type === 'error'
      ? 'bg-red-600 text-white'
      : type === 'success'
      ? 'bg-emerald-600 text-white'
      : 'bg-gray-900 text-white';
  return <div className={`${base} ${tone}`}>{text}</div>;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loadingBoot, setLoadingBoot] = useState(true);

  const [wallet, setWallet] = useState(0);
  const [services, setServices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [amount, setAmount] = useState('');
  const [funding, setFunding] = useState(false);

  const [order, setOrder] = useState({ service: '', link: '', quantity: '' });
  const [estimate, setEstimate] = useState(0);

  const [toast, setToast] = useState({ text: '', type: 'info' });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [counts, setCounts] = useState({ total: 0, byStatus: {} });

  const [search, setSearch] = useState('');
  const [openList, setOpenList] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const serviceNameById = useMemo(() => {
    const map = new Map();
    for (const s of services || []) map.set(String(s.service), s.name);
    return map;
  }, [services]);

  const computeEstimate = (svcId, qty) => {
    if (!svcId || !qty) return 0;
    const svc = (services || []).find((s) => String(s.service) === String(svcId));
    if (!svc) return 0;
    const rate = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE || 1700);
    const margin = Number(process.env.NEXT_PUBLIC_MARGIN_PERCENT || 20);
    const usdPer1k = Number(svc.rate || 0);
    const price = (usdPer1k * (Number(qty) / 1000)) * rate * (1 + margin / 100);
    return Math.ceil(price);
  };
  useEffect(() => setEstimate(computeEstimate(order.service, order.quantity)), [order, services]);

  useEffect(() => {
    initFirebase();
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) { setLoadingBoot(false); return; }

      try {
        const token = await u.getIdToken(true);
        const [w, s] = await Promise.all([
          fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()),
          fetch('/api/jap/services').then(r=>r.json()),
        ]);
        setWallet(Number(w?.balance || 0));
        setServices(Array.isArray(s) ? s : []);
        if (!s || !s.length) setToast({ text: 'Could not load services. Check JAP_API_KEY.', type: 'error' });
      } catch {
        setToast({ text: 'Failed to load data.', type: 'error' });
      } finally {
        setLoadingBoot(false);
      }

      await Promise.all([refreshOrders(), refreshHistory()]);
    });
    return () => unsub();
  }, []);

  const refreshOrders = async () => {
    try {
      setLoadingOrders(true);
      const cu = getAuth().currentUser;
      if (!cu) return;
      const token = await cu.getIdToken(true);
      const res = await fetch('/api/orders/my?limit=50', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (!res.ok) {
        setOrders([]);
        setCounts({ total: 0, byStatus: {} });
        setNextCursor(null);
        if (data?.index_required) setToast({ text: 'Firestore index needed for orders.', type: 'error' });
        return;
      }

      setOrders(Array.isArray(data?.items) ? data.items : []);
      setCounts({
        total: Number(data?.counts?.total || (data?.items?.length || 0)),
        byStatus: data?.counts?.byStatus || {},
      });
      setNextCursor(data?.page?.nextCursor || null);
    } finally { setLoadingOrders(false); }
  };

  const loadMoreOrders = async () => {
    if (!nextCursor) return;
    try {
      setLoadingMore(true);
      const cu = getAuth().currentUser;
      if (!cu) return;
      const token = await cu.getIdToken(true);
      const res = await fetch(`/api/orders/my?limit=50&after=${encodeURIComponent(nextCursor)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data?.items)) {
        setOrders((prev) => [...prev, ...data.items]);
        setNextCursor(data?.page?.nextCursor || null);
      }
    } finally { setLoadingMore(false); }
  };

  const refreshHistory = async () => {
    try {
      setLoadingTx(true);
      const cu = getAuth().currentUser; if (!cu) return;
      const token = await cu.getIdToken(true);
      const res = await fetch('/api/wallet/history', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTransactions(Array.isArray(data?.items) ? data.items : []);
      const w = await fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json());
      setWallet(Number(w?.balance || 0));
    } finally { setLoadingTx(false); }
  };

  // ---- NEW: one-click sync with JAP for a single order ----
  const syncOrder = async (orderId) => {
    try {
      const cu = getAuth().currentUser; if (!cu) return;
      const token = await cu.getIdToken(true);
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || 'Sync failed');

      // Update the item in-place to feel snappy
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: data.status } : o));
      setToast({ text: `Order #${orderId} → ${data.status}`, type: 'success' });
    } catch (e) {
      setToast({ text: String(e.message || e), type: 'error' });
    }
  };

  const filtered = useMemo(() => {
    const term = (search || '').toLowerCase();
    const list = services || [];
    if (!term) return list.slice(0, 20);
    return list.filter(s => (s.name + ' ' + s.category).toLowerCase().includes(term)).slice(0, 30);
  }, [search, services]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!listRef.current || !inputRef.current) return;
      if (!listRef.current.contains(e.target) && !inputRef.current.contains(e.target)) setOpenList(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  if (loadingBoot) return (<><NavBar/><Spinner label="Loading Dashboard…" /></>);
  if (!user) {
    return (
      <>
        <NavBar />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold">Please sign in</h2>
          <p className="text-gray-500 mt-2">You need to be logged in to view your dashboard.</p>
          <div className="mt-4">
            <Link href="/login" className="btn-primary">Go to Login</Link>
          </div>
        </div>
      </>
    );
  }

  const by = counts.byStatus || {};
  const serviceLabel = (sid) => serviceNameById.get(String(sid)) || sid;

  return (
    <>
      <NavBar />
      <Toast {...toast} />

      <div className="relative">
        <div className="absolute inset-x-0 -z-10 h-40 bg-gradient-to-r from-brand/20 via-purple-300/30 to-brand/20 blur-2xl dark:from-brand/10 dark:to-brand/10" />
      </div>

      <div className="container py-6 space-y-6">
        {/* Wallet */}
        {/* ... (unchanged wallet + fund UI) ... */}

        {/* Place Order */}
        {/* ... (unchanged form) ... */}

        {/* Orders */}
        <section className="card p-5 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h5 className="font-semibold text-lg">Your orders</h5>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1">
                  Total: <b>{counts.total}</b>
                </span>
                {Object.entries(by).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 capitalize">
                    {k}: <b>{v}</b>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={refreshOrders} disabled={loadingOrders}>Refresh</button>
              {nextCursor && (
                <button className="btn-outline" onClick={loadMoreOrders} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            {loadingOrders ? (
              <Spinner label="Loading orders…" />
            ) : orders.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-6 text-center">No orders yet.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2 pr-4">Order #</th>
                    <th className="py-2 pr-4">Service</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Price (₦)</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const isFinal = ['completed','canceled'].includes(String(o.status || '').toLowerCase());
                    return (
                      <tr key={o.id} className="border-b border-gray-100 dark:border-gray-900">
                        <td className="py-2 pr-4">{o.id}</td>
                        <td className="py-2 pr-4">{serviceLabel(o.service)}</td>
                        <td className="py-2 pr-4">{o.quantity}</td>
                        <td className="py-2 pr-4">₦{Number(o.priceNGN || 0).toLocaleString()}</td>
                        <td className="py-2 pr-4 capitalize">
                          <div className="flex items-center gap-2">
                            <span>{o.status || 'pending'}</span>
                            {!isFinal && (
                              <button
                                className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={() => syncOrder(o.id)}
                                title="Fetch latest status from provider"
                              >
                                Sync
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">{(o.createdAt || '').slice(0, 19).replace('T', ' ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Transactions (unchanged) */}
        {/* ... */}
      </div>

      <WhatsAppButton />
    </>
  );
}