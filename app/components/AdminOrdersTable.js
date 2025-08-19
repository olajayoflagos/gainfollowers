'use client';
export default function AdminOrdersTable({ orders=[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead><tr><th>When</th><th>UID</th><th>Order #</th><th>Service</th><th>Qty</th><th>Price₦</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.createdAt?.slice(0,19).replace('T',' ')}</td>
              <td>{o.uid}</td>
              <td>{o.orderId}</td>
              <td>{o.service}</td>
              <td>{o.quantity}</td>
              <td>{Number(o.priceNGN||0).toLocaleString()}</td>
              <td><span className="badge">{o.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
