'use client';
export default function AdminUsersList({ users=[] }) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {users.map(u => (
        <li key={u.uid} className="py-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">{u.uid}</div>
            <div>{u.email || '(no email)'}</div>
          </div>
          <div className="font-medium">₦{Number(u.balance||0).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}
