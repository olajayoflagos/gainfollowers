'use client';
import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import { getAuth } from 'firebase/auth';

const AdminOrdersTable = dynamic(() => import('../components/AdminOrdersTable'), { ssr: false, loading: () => <Spinner label="Loading orders…" /> });
const AdminUsersList = dynamic(() => import('../components/AdminUsersList'), { ssr: false, loading: () => <Spinner label="Loading users…" /> });

export default function AdminPage() {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uidAdjust, setUidAdjust] = useState('');
  const [delta, setDelta] = useState('');

  useEffect(() => {
    initFirebase();
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken(true);
        if (!token) { setErr('Please log in as admin'); setLoading(false); return; }
        const [o,u] = await Promise.all([
          fetch('/api/admin/orders?limit=100', { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()),
          fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json())
        ]);
        if (o.error || u.error) throw new Error(o.error || u.error);
        setOrders(o.items || []); setUsers(u.users || []); setOk(true);
      } catch (e) { setErr(e.message); } finally { setLoading(false); }
    })();
  }, []);

  const adjust = async () => {
    try {
      const token = await getAuth().currentUser.getIdToken();
      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: uidAdjust, delta: Number(delta) })
      });
      const data = await res.json();
      alert(data.error || 'Wallet adjusted');
    } catch (e) { alert(e.message); }
  };

  if (loading) return (<><NavBar/><Spinner label="Loading Admin…" /></>);
  if (!ok) return (<><NavBar/><div className="container py-5"><div className="card p-5 text-red-600">{err || 'Not admin'}</div></div></>);

  return (
    <>
      <NavBar/>
      <div className="container py-6 grid md:grid-cols-3 gap-6">
        <section className="card p-5 md:col-span-2">
          <h5 className="font-semibold mb-3">Recent Orders</h5>
          <AdminOrdersTable orders={orders} />
        </section>
        <section className="card p-5">
          <h5 className="font-semibold mb-3">Users (wallet holders)</h5>
          <AdminUsersList users={users} />
          <div className="mt-6 space-y-2">
            <h6 className="font-semibold">Adjust Wallet</h6>
            <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" placeholder="User UID" value={uidAdjust} onChange={e=>setUidAdjust(e.target.value)}/>
            <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" type="number" placeholder="Delta (₦)" value={delta} onChange={e=>setDelta(e.target.value)}/>
            <button className="btn-primary" onClick={adjust}>Apply</button>
          </div>
        </section>
      </div>
    </>
  );
}
