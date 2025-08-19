'use client';
export default function OrdersTable({ orders=[] }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="table">
        <thead><tr><th>When</th><th>Order #</th><th>Service</th><th>Qty</th><th>Status</th><th>Remains</th></tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.createdAt?.slice(0,19).replace('T',' ')}</td>
              <td>{o.orderId}</td>
              <td>{o.service}</td>
              <td>{o.quantity}</td>
              <td><span className="badge">{o.status || 'created'}</span></td>
              <td>{o.remains ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
