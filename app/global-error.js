'use client';
export default function GlobalError({ error, reset }) {
  console.error('Global error:', error);
  return (
    <html><body>
      <div className="container py-20">
        <h3 className="text-2xl font-bold">Something went wrong</h3>
        <p className="text-gray-500 mt-2">Please try again.</p>
        <button className="btn-primary mt-4" onClick={() => reset()}>Reload</button>
      </div>
    </body></html>
  );
}
