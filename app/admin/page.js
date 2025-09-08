'use client';

import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const AdminOrdersTable = dynamic(() => import('../components/AdminOrdersTable'), {
  ssr: false,
  loading: () => <Spinner label="Loading orders…" />,
});
const AdminUsersList = dynamic(() => import('../components/AdminUsersList'), {
  ssr: false,
  loading: () => <Spinner label="Loading users…" />,
});

// Tiny toast
function Toast({ text, type = 'info' }) {
  if (!text) return null;
  const base =
    'fixed z-40 bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 shadow-lg';
  const tone =
    type === 'error'
      ? 'bg-red-600 text-white'
      : type === 'success'
      ? 'bg-emerald-600 text-white'
      : 'bg-gray-900 text-white';
  return <div className={`${base} ${tone}`}>{text}</div>;
}

// CSV helper
function toCSV(rows) {
  if (!rows?.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map(esc).join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

export default function AdminPage() {
  const [authReady, setAuthReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [auto, setAuto] = useState(false); // 🔕 default OFF
  const [toast, setToast] = useState({ text: '', type: 'info' });

  // wallet adjust
  const [uidAdjust, setUidAdjust] = useState('');
  const [delta, setDelta] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    initFirebase();
    const unsub = onAuthStateChanged(getAuth(), () => setAuthReady(true));
    return () => unsub();
  }, []);

  const getToken = async () => {
    const u = getAuth().currentUser;
    return u ? u.getIdToken(true) : null;
    // (we only call fetchData after authReady, so this won’t race)
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setOk(false);
        setErr('Please log in as admin');
        return;
      }
      const [o, u] = await Promise.all([
        fetch('/api/admin/orders?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ]);
      if (o?.error) throw new Error(o.error);
      if (u?.error) throw new Error(u.error);
      setOrders(Array.isArray(o.items) ? o.items : []);
      setUsers(Array.isArray(u.users) ? u.users : []);
      setOk(true);
      setErr('');
    } catch (e) {
      setOk(false);
      setErr(e?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  // First load only after auth status is known (prevents “log in as admin” flash)
  useEffect(() => {
    if (authReady) fetchData();
  }, [authReady, fetchData]);

  // Optional auto-refresh (off by default)
  useEffect(() => {
    if (!auto) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(fetchData, 45000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auto, fetchData]);

  // filter orders in UI
  const filteredOrders = useMemo(() => {
    const q = (search || '').toLowerCase();
    const st = (status || '').toLowerCase();
    return (orders || []).filter((o) => {
      const hit =
        (o.id && String(o.id).toLowerCase().includes(q)) ||
        (o.orderId && String(o.orderId).toLowerCase().includes(q)) ||
        (o.service && String(o.service).toLowerCase().includes(q)) ||
        (o.email && String(o.email).toLowerCase().includes(q));
      const statusOk =
        !st || (o.status && String(o.status).toLowerCase() === st);
      return hit && statusOk;
    });
  }, [orders, search, status]);

  // quick stats
  const stats = useMemo(() => {
    const n = filteredOrders.length;
    const totalNGN = filteredOrders.reduce(
      (a, b) => a + Number(b.priceNGN || 0),
      0
    );
    return { n, totalNGN };
  }, [filteredOrders]);

  const exportCSV = () => {
    const rows = filteredOrders.map((o) => ({
      id: o.id,
      orderId: o.orderId || '',
      service: o.service,
      qty: o.quantity,
      priceNGN: o.priceNGN,
      status: o.status,
      createdAt: o.createdAt,
      email: o.email || '',
      uid: o.uid || '',
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const adjust = async () => {
    try {
      const v = Number(delta);
      if (!uidAdjust) return setToast({ text: 'Enter a user UID', type: 'error' });
      if (!Number.isFinite(v))
        return setToast({ text: 'Enter a valid amount (₦)', type: 'error' });
      const token = await getToken();
      if (!token) return setToast({ text: 'Please log in again', type: 'error' });

      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: uidAdjust.trim(), delta: v }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ text: 'Wallet adjusted', type: 'success' });
        setUidAdjust('');
        setDelta('');
        fetchData();
      } else {
        setToast({ text: data?.error || 'Adjust failed', type: 'error' });
      }
    } catch (e) {
      setToast({ text: e?.message || 'Adjust failed', type: 'error' });
    } finally {
      setTimeout(() => setToast({ text: '' }), 1500);
    }
  };

  if (!authReady || loading)
    return (
      <>
        <NavBar />
        <Spinner label="Loading Admin…" />
      </>
    );

  if (!ok) {
    return (
      <>
        <NavBar />
        <div className="container py-6">
          <div className="card p-5 text-red-600">{err || 'Not admin'}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Toast {...toast} />

      <div className="container py-6 space-y-6">
        {/* Toolbar */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Admin</h3>
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                <div>
                  Orders:{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {stats.n}
                  </span>
                </div>
                <div>
                  Revenue:{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    ₦{Number(stats.totalNGN).toLocaleString()}
                  </span>
                </div>
                <div>
                  Users:{' '}
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {users.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                className="h-9 w-full sm:w-56 rounded-md border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                placeholder="Search orders (id/service/email)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="h-9 w-full sm:w-auto rounded-md border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pending">pending</option>
                <option value="processing">processing</option>
                <option value="completed">completed</option>
                <option value="partial">partial</option>
                <option value="canceled">canceled</option>
                <option value="failed">failed</option>
              </select>

              <div className="flex gap-2">
                <button className="btn-outline h-9" onClick={fetchData}>
                  Refresh
                </button>
                <button className="btn-outline h-9" onClick={exportCSV}>
                  Export CSV
                </button>
                <label className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm dark:border-gray-700">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={auto}
                    onChange={(e) => setAuto(e.target.checked)}
                  />
                  Auto-refresh
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Main grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Orders */}
          <section className="md:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h5 className="mb-3 font-semibold">Recent Orders</h5>
            <AdminOrdersTable orders={filteredOrders} />
            {filteredOrders.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                No matching orders.
              </div>
            )}
          </section>

          {/* Users + Adjust */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h5 className="mb-3 font-semibold">Users (wallet holders)</h5>
            <AdminUsersList
              users={users.filter((u) => {
                const q = (search || '').toLowerCase();
                return (
                  !q ||
                  String(u.email || '').toLowerCase().includes(q) ||
                  String(u.uid || '').toLowerCase().includes(q)
                );
              })}
            />

            <div className="mt-6 space-y-2">
              <h6 className="font-semibold">Adjust Wallet</h6>
              <input
                className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                placeholder="User UID"
                value={uidAdjust}
                onChange={(e) => setUidAdjust(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                type="number"
                placeholder="Delta (₦) — use negative to deduct"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <button className="btn-primary" onClick={adjust}>
                  Apply
                </button>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setUidAdjust('');
                    setDelta('');
                  }}
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Tip: you can paste a UID from the Users list above.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}