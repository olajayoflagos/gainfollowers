import NavBar from '../components/NavBar';
import { headers } from 'next/headers';
async function getServices() {
  const h = headers();
  const base = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  const res = await fetch(`${base}/api/jap/services`, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  return res.json();
}
export const metadata = { title: 'Services | Gainfollowers' };
export default async function ServicesPage() {
  const data = await getServices();
  const categories = Array.from(new Set((data || []).map(s => s.category))).sort();
  return (<>
    <NavBar/>
    <div className="container py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Services</h2><p className="text-sm text-gray-500">Prices shown are estimates in NGN.</p></div>
        <div className="flex items-center gap-2">
          <input id="search" placeholder="Search services…" className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
          <select id="category" className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
            <option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 card"><div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Category</th><th>Min</th><th>Max</th></tr></thead>
          <tbody id="tbody">
            {(data || []).map(s => (
              <tr key={s.service} data-category={s.category.toLowerCase()} data-name={`${s.name} ${s.category}`.toLowerCase()}>
                <td>{s.name}</td><td className="text-gray-500">{s.category}</td><td>{s.min}</td><td>{s.max}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
    <script dangerouslySetInnerHTML={{__html:`
      const q=document.getElementById('search');const c=document.getElementById('category');const tb=document.getElementById('tbody');
      function apply(){const term=(q.value||'').toLowerCase();const cat=(c.value||'').toLowerCase();
        for(const tr of tb.querySelectorAll('tr')){const n=tr.dataset.name.includes(term);const k=!cat||tr.dataset.category===cat;tr.style.display=(n&&k)?'':'none';}}
      q?.addEventListener('input',apply);c?.addEventListener('change',apply);
    `}}/>
  </>);
}
