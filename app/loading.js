export default function RootLoading() {
  return (
    <div className="container py-8">
      {/* Page header skeleton */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-gray-100 dark:bg-gray-900 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-56 rounded-md bg-gray-100 dark:bg-gray-900 animate-pulse" />
          <div className="h-9 w-44 rounded-md bg-gray-100 dark:bg-gray-900 animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800">
                {['Name', 'Category', 'Min', 'Max', '₦ / 1k', '₦ / 10', '₦ / 1'].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody aria-busy="true" aria-live="polite">
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-900">
                  <td className="px-4 py-3">
                    <div className="h-4 w-52 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-36 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-12 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-14 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          Loading… please wait.
        </div>
      </div>
    </div>
  );
}