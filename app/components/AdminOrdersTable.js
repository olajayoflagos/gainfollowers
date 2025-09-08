'use client';

export default function AdminOrdersTable({ orders = [] }) {
  if (!orders.length) return null;

  return (
    <div className="space-y-3">
      {/* Mobile: stacked cards */}
      <div className="grid gap-3 sm:hidden">
        {orders.map((o) => (
          <div
            key={o.id}
            className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">#{o.id}</div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize dark:bg-gray-800">
                {o.status || '-'}
              </span>
            </div>
            <div className="mt-2 text-gray-700 dark:text-gray-300">
              <div>Service: {o.service}</div>
              <div>Qty: {o.quantity}</div>
              <div>Price: ₦{Number(o.priceNGN || 0).toLocaleString()}</div>
              <div>Created: {(o.createdAt || '').slice(0, 19).replace('T', ' ')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 pr-4 pl-2 sm:pl-0">Order #</th>
              <th className="py-2 pr-4">Service</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 pr-4">Price (₦)</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b border-gray-100 dark:border-gray-900"
              >
                <td className="py-2 pr-4 pl-2 sm:pl-0">{o.id}</td>
                <td className="py-2 pr-4">{o.service}</td>
                <td className="py-2 pr-4">{o.quantity}</td>
                <td className="py-2 pr-4">
                  ₦{Number(o.priceNGN || 0).toLocaleString()}
                </td>
                <td className="py-2 pr-4 capitalize">{o.status}</td>
                <td className="py-2 pr-4">
                  {(o.createdAt || '').slice(0, 19).replace('T', ' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}