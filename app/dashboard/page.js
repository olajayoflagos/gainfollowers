'use client';
import Protected from '../components/Protected';
import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { initFirebase } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
const OrdersTable = dynamic(() => import('../components/OrdersTable'), { ssr: false, loading: () => <Spinner label="Loading your orders…" /> });
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [order, setOrder] = useState({ service: '', link: '', quantity: '' });
  const [estimate, setEstimate] = useState(0);
  const [toast, setToast] = useState({ text:'', type:'info' });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const computeEstimate = (svcId, qty) => {
    if (!svcId || !qty) return 0;
    const svc = (services || []).find(s => String(s.service) === String(svcId));
    if (!svc) return 0;
    const rate = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE || process.env.USD_NGN_RATE || 1600);
    const margin = Number(process.env.NEXT_PUBLIC_MARGIN_PERCENT || process.env.MARGIN_PERCENT || 20);
    const usdPer1k = Number(svc.rate || 0);
    const price = (usdPer1k * (Number(qty)/1000)) * rate * (1 + margin/100);
    return Math.ceil(price);
  };
  useEffect(() => { setEstimate(computeEstimate(order.service, order.quantity)); }, [order, services]);
  useEffect(() => {
    initFirebase();
    const auth = getAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return;
      const [w, s] = await Promise.all([
        fetch('/api/user/me', { headers: { Authorization: `Bearer ${await u.getIdToken()}` } }).then(r=>r.json()),
        fetch('/api/jap/services').then(r=>r.json())
      ]);
      setWallet(w.balance || 0); setServices(s || []); if(!s||!s.length) setToast({text:'Could not load services. Check JAP_API_KEY.', type:'error'});
      setLoading(false);
      refreshOrders(); const id = setInterval(refreshOrders, 15000); return () => clearInterval(id);
    });
  }, []);
  const refreshOrders = async () => { try { setLoadingOrders(true);
    const token = await getAuth().currentUser.getIdToken();
    const res = await fetch('/api/orders/my', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json(); setOrders(data.items || []);
  } finally { setLoadingOrders(false); } };
  const fund = async () => {
    if (!amount) return;
    const token = await getAuth().currentUser.getIdToken();
    const res = await fetch('/api/paystack/initialize', {
      method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: Number(amount) })
    });
    const data = await res.json();
    if (data?.authorization_url) window.location.href = data.authorization_url;
    else setToast({ text: 'Unable to initialize payment.', type:'error' });
  };
  const placeOrder = async (e) => {
    e.preventDefault();
    const token = await getAuth().currentUser.getIdToken();
    const res = await fetch('/api/orders/create', {
      method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(order)
    });
    const data = await res.json();
    if (res.ok) { setToast({ text:`Order placed #${data.orderId}`, type:'success' }); refreshOrders(); }
    else setToast({ text: data.error || 'Failed to place order.', type:'error' });
  };
  if (loading) return <><NavBar/><Spinner label="Loading Dashboard…" /></>;
  return (<Protected>
    <NavBar/><Toast {...toast}/>
    <div className="container py-6 grid md:grid-cols-3 gap-6">
      <section className="card p-5"><h5 className="font-semibold">Wallet</h5><p className="text-3xl mt-2">₦{Number(wallet).toLocaleString()}</p>
        <div className="mt-3 flex gap-2"><input className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" type="number" placeholder="Amount (NGN)" value={amount} onChange={e=>setAmount(e.target.value)}/><button className="btn-primary" onClick={fund}>Fund</button></div>
        <a className="btn-link mt-3 inline-block" href="/profile">Profile</a>
      </section>
      <section className="card p-5 md:col-span-2"><h5 className="font-semibold">Place Order</h5>
        <form className="grid md:grid-cols-3 gap-3 mt-3" onSubmit={placeOrder}>
          <select className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" required value={order.service} onChange={e=>setOrder(o=>({...o, service:e.target.value}))}>
            <option value="">Select a service</option>{services.map(s => <option key={s.service} value={s.service}>{s.category} — {s.name}</option>)}
          </select>
          <input className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" placeholder="Link (URL / username)" required value={order.link} onChange={e=>setOrder(o=>({...o, link:e.target.value}))}/>
          <input className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" type="number" min="1" placeholder="Quantity" required value={order.quantity} onChange={e=>setOrder(o=>({...o, quantity:e.target.value}))}/>
          <div className="md:col-span-3 flex items-center justify-between"><div className="text-sm text-gray-500">Estimated price: <span className="font-semibold text-gray-800 dark:text-gray-100">₦{Number(estimate||0).toLocaleString()}</span></div><button className="btn-primary" type="submit">Order</button></div>
        </form>
      </section>
      <section className="card p-5 md:col-span-3"><div className="flex items-center justify-between"><h5 className="font-semibold">My Recent Orders</h5><button className="btn-outline" onClick={refreshOrders} disabled={loadingOrders}>Refresh</button></div><div id="orders-root"></div></section>
    </div>
  </Protected>);
}
