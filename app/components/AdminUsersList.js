'use client';

export default function AdminUsersList({ users = [] }) {
  if (!users.length) return null;

  return (
    <div className="space-y-3">
      {/* Mobile: stacked cards */}
      <div className="grid gap-3 sm:hidden">
        {users.map((u) => (
          <div
            key={u.uid}
            className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
          >
            <div className="font-medium">{u.email || '(no email)'}</div>
            <div className="text-xs text-gray-500">{u.uid}</div>
            <div className="mt-2 text-gray-700 dark:text-gray-300">
              Balance: ₦{Number(u.balance || 0).toLocaleString()}
              {u.disabled ? (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  disabled
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 pr-4 pl-2 sm:pl-0">Email</th>
              <th className="py-2 pr-4">UID</th>
              <th className="py-2 pr-4">Balance (₦)</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.uid}
                className="border-b border-gray-100 dark:border-gray-900"
              >
                <td className="py-2 pr-4 pl-2 sm:pl-0">{u.email || '(no email)'}</td>
                <td className="py-2 pr-4">{u.uid}</td>
                <td className="py-2 pr-4">
                  ₦{Number(u.balance || 0).toLocaleString()}
                </td>
                <td className="py-2 pr-4">
                  {u.disabled ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      disabled
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}