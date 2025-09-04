'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initFirebase } from '../../lib/firebaseClient'; // <= relative path (no "@/lib")
import NavBar from '../components/NavBar';
import WhatsAppButton from '../components/WhatsAppButton';

// ---- Minimal inline UI helpers (so we don't depend on your custom components) ----
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
// ---------------------------------------------------------------------------------

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loadingBoot, setLoadingBoot] = useState(true);

  const [wallet, setWallet] = useState(0);
  const [services, setServices] = useState([]);

  const [amount, setAmount] = useState('');
  const [order, setOrder] = useState({ service: '', link: '', quantity: '' });
  const [estimate, setEstimate] = useState(0);

  const [toast, setToast] = useState({ text: '', type: 'info' });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Searchable service dropdown
  const [search, setSearch] = useState('');
  const [openList, setOpenList] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // --- NGN estimate (reads NEXT_PUBLIC_* only so build doesn't break) ---
  const computeEstimate = (svcId, qty) => {
    if (!svcId || !qty) return 0;
    const svc = (services || []).find((s) => String(s.service) === String(svcId));
    if (!svc) return 0;
    const rate = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE || 1600);
    const margin = Number(process.env.NEXT_PUBLIC_MARGIN_PERCENT || 20);
    const usdPer1k = Number(svc.rate || 0);
    const price = (usdPer1k * (Number(qty) / 1000)) * rate * (1 + margin / 100);
    return Math.ceil(price);
  };
  useEffect(() => {
    setEstimate(computeEstimate(order.service, order.quantity));
  }, [order, services]); // eslint-disable-line

  // --- Boot: auth + fetch wallet/services, then start polling orders ---
  useEffect(() => {
    initFirebase();
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setLoadingBoot(false);
        return;
      }
      try {
        const [w, s] = await Promise.all([
          fetch('/api/user/me', {
            headers: { Authorization: `Bearer ${await u.getIdToken()}` },
          }).then((r) => r.json()),
          fetch('/api/jap/services').then((r) => r.json()),
        ]);
        setWallet(Number(w?.balance || 0));
        setServices(Array.isArray(s) ? s : []);
        if (!s || !s.length) {
          setToast({ text: 'Could not load services. Check JAP_API_KEY.', type: 'error' });
        }
      } catch (e) {
        setToast({ text: 'Failed to load data.', type: 'error' });
      } finally {
        setLoadingBoot(false);
      }
      refreshOrders();
      const id = setInterval(refreshOrders, 15000);
      return () => clearInterval(id);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshOrders = async () => {
    try {
      setLoadingOrders(true);
      const auth = getAuth();
      const cu = auth.currentUser;
      if (!cu) return; // guard if auth not ready
      const token = await cu.getIdToken();
      const res = await fetch('/api/orders/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(Array.isArray(data?.items) ? data.items : []);
    } catch {
      // silent
    } finally {
      setLoadingOrders(false);
    }
  };

  const fund = async () => {
    if (!amount) return;
    try {
      const auth = getAuth();
      const cu = auth.currentUser;
      if (!cu) return setToast({ text: 'Please log in again.', type: 'error' });
      const token = await cu.getIdToken();

      // >>> IMPORTANT: include callbackUrl so we can verify & credit without webhook
      const callbackUrl = `${window.location.origin}/paystack/callback`;

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), callbackUrl }),
      });
      const data = await res.json();
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setToast({ text: 'Unable to initialize payment.', type: 'error' });
      }
    } catch {
      setToast({ text: 'Payment init failed.', type: 'error' });
    }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!order.service) return setToast({ text: 'Please select a service.', type: 'error' });
    try {
      const auth = getAuth();
      const cu = auth.currentUser;
      if (!cu) return setToast({ text: 'Please log in again.', type: 'error' });
      const token = await cu.getIdToken();

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(order),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ text: `Order placed #${data.orderId}`, type: 'success' });
        setOrder({ service: '', link: '', quantity: '' });
        setSearch('');
        refreshOrders();
      } else {
        setToast({ text: data?.error || 'Failed to place order.', type: 'error' });
      }
    } catch {
      setToast({ text: 'Order request failed.', type: 'error' });
    }
  };

  // Filter services for the dropdown
  const filtered = useMemo(() => {
    const term = (search || '').toLowerCase();
    const list = services || [];
    if (!term) return list.slice(0, 20);
    return list
      .filter((s) => (s.name + ' ' + s.category).toLowerCase().includes(term))
      .slice(0, 30);
  }, [search, services]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!listRef.current || !inputRef.current) return;
      if (!listRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setOpenList(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // ---- Loading / Not logged in states ----
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

  // ---- Main UI ----
  return (
    <>
      <NavBar />
      <Toast {...toast} />

      {/* subtle background glow */}
      <div className="relative">
        <div className="absolute inset-x-0 -z-10 h-40 bg-gradient-to-r from-brand/20 via-purple-300/30 to-brand/20 blur-2xl dark:from-brand/10 dark:to-brand/10" />
      </div>

      <div className="container py-6 space-y-6">
        {/* Wallet */}
        <section className="card p-5 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h5 className="font-semibold text-lg">Wallet balance</h5>
              <p className="text-4xl mt-1 tracking-tight">₦{Number(wallet).toLocaleString()}</p>
            </div>
            <div className="w-full sm:w-auto flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
                type="number"
                placeholder="Amount (NGN)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button className="btn-primary whitespace-nowrap" onClick={fund}>Fund</button>
            </div>
          </div>
          <a className="btn-link mt-3 inline-block" href="/profile">Profile</a>
        </section>

        {/* Place Order */}
        <section className="card p-5 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h5 className="font-semibold text-lg">Place an order</h5>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {/* Searchable picker */}
            <div className="md:col-span-3">
              <label className="text-sm text-gray-500">Search service</label>
              <div className="relative mt-1" ref={listRef}>
                <input
                  ref={inputRef}
                  placeholder="Type to search by name or category…"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
                  onFocus={() => setOpenList(true)}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOpenList(true);
                  }}
                />
                {openList && (
                  <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
                    {filtered.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                    )}
                    {filtered.map((s) => (
                      <button
                        key={s.service}
                        type="button"
                        onClick={() => {
                          setOrder((o) => ({ ...o, service: String(s.service) }));
                          setSearch(`${s.name} — ${s.category}`);
                          setOpenList(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-500">
                          {s.category} • min {s.min} • max {s.max}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <input
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
              placeholder="Link (URL / username)"
              required
              value={order.link}
              onChange={(e) => setOrder((o) => ({ ...o, link: e.target.value }))}
            />

            <input
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
              type="number"
              min="1"
              placeholder="Quantity"
              required
              value={order.quantity}
              onChange={(e) => setOrder((o) => ({ ...o, quantity: e.target.value }))}
            />

            <div className="md:col-span-3 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                Estimated price:&nbsp;
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  ₦{Number(estimate || 0).toLocaleString()}
                </span>
              </div>
              <button className="btn-primary" onClick={placeOrder}>Order</button>
            </div>

            {(() => {
              const s = (services || []).find((x) => String(x.service) === String(order.service));
              if (!s) return null;
              return (
                <div className="md:col-span-3 mt-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 mr-2">
                    {s.category}
                  </span>
                  Min: {s.min} • Max: {s.max}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Orders */}
        <section className="card p-5 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h5 className="font-semibold text-lg">Your recent orders</h5>
            <button className="btn-outline" onClick={refreshOrders} disabled={loadingOrders}>
              Refresh
            </button>
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
                  {orders.map((o) => (
                    <tr key={o.orderId} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="py-2 pr-4">{o.orderId}</td>
                      <td className="py-2 pr-4">{o.service}</td>
                      <td className="py-2 pr-4">{o.quantity}</td>
                      <td className="py-2 pr-4">₦{Number(o.priceNGN || 0).toLocaleString()}</td>
                      <td className="py-2 pr-4 capitalize">{o.status}</td>
                      <td className="py-2 pr-4">{o.createdAt?.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Floating WhatsApp Contact */}
      <WhatsAppButton />
    </>
  );
}
