// app/services/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NavBar from '../components/NavBar';

// NGN formatter
const fmt = (n) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(Number(n || 0))));

export default function ServicesPage() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  // Category dropdown state
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  const catRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!catRef.current) return;
      if (!catRef.current.contains(e.target)) setCatOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Fetch services and compute NGN pricing on client
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/jap/services', { cache: 'no-store' });
        const data = await res.json();
        const usdNgn = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE || 1700);
        const margin = Number(process.env.NEXT_PUBLIC_MARGIN_PERCENT || 20);
        const mul = usdNgn * (1 + margin / 100);

        const enriched = (Array.isArray(data) ? data : []).map((s) => {
          const rateUSD1k = Number(s.rate || 0);
          const per1k = rateUSD1k * mul;
          const per10 = per1k * (10 / 1000);
          const per1 = per1k / 1000;
          return {
            ...s,
            priceNGN_1k: Math.round(per1k),
            priceNGN_10: Math.round(per10),
            priceNGN_1: Math.round(per1),
          };
        });

        setRaw(enriched);
      } catch {
        setRaw([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // All categories & filtered list for dropdown
  const allCategories = useMemo(() => {
    return Array.from(new Set(raw.map((s) => s.category))).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [raw]);

  const filteredCatOptions = useMemo(() => {
    const q = (catQuery || '').toLowerCase();
    if (!q) return allCategories;
    return allCategories.filter((c) => String(c).toLowerCase().includes(q));
  }, [allCategories, catQuery]);

  // Apply search + category filter + sort
  const rows = useMemo(() => {
    const term = (search || '').toLowerCase();
    const catSet = new Set(selectedCats.map((x) => String(x).toLowerCase()));

    let items = raw.filter((s) => {
      const nameCat = `${s.name} ${s.category}`.toLowerCase();
      const textOk = !term || nameCat.includes(term);
      const catOk = catSet.size === 0 || catSet.has(String(s.category).toLowerCase());
      return textOk && catOk;
    });

    switch (sortBy) {
      case 'p1k_asc':
        items = items.sort((a, b) => a.priceNGN_1k - b.priceNGN_1k);
        break;
      case 'p10_asc':
        items = items.sort((a, b) => a.priceNGN_10 - b.priceNGN_10);
        break;
      case 'p1_asc':
        items = items.sort((a, b) => a.priceNGN_1 - b.priceNGN_1);
        break;
      case 'name_asc':
      default:
        items = items.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        break;
    }

    return items;
  }, [raw, search, selectedCats, sortBy]);

  // Toggle category selection
  const toggleCat = (c) => {
    setSelectedCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  return (
    <>
      <NavBar />
      <div className="container py-8 space-y-4">

        {/* Filters */}
        <div className="card p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {/* Search */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500">Search</label>
              <input
                className="input mt-1"
                placeholder="e.g. Instagram followers, YouTube views…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category multi-select dropdown (searchable) */}
            <div className="flex flex-col relative" ref={catRef}>
              <label className="text-xs font-medium text-gray-500">Category</label>
              <button
                type="button"
                className="input mt-1 text-left"
                onClick={() => setCatOpen((v) => !v)}
              >
                {selectedCats.length === 0
                  ? 'All categories'
                  : `${selectedCats.length} selected`}
              </button>

              {catOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 max-h-80 overflow-auto">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
                    <input
                      className="input"
                      placeholder="Type to filter categories…"
                      value={catQuery}
                      onChange={(e) => setCatQuery(e.target.value)}
                    />
                  </div>
                  <div className="p-2 space-y-1">
                    {filteredCatOptions.length === 0 && (
                      <div className="text-sm text-gray-500 px-2 py-1.5">No matches</div>
                    )}
                    {filteredCatOptions.map((c) => {
                      const checked = selectedCats.includes(c);
                      return (
                        <label
                          key={c}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-violet-600"
                            checked={checked}
                            onChange={() => toggleCat(c)}
                          />
                          <span className="text-sm">{c}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <button
                      className="btn-ghost text-sm"
                      onClick={() => setSelectedCats([])}
                    >
                      Clear
                    </button>
                    <button className="btn-primary text-sm" onClick={() => setCatOpen(false)}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500">Sort</label>
              <select
                className="input mt-1"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name_asc">Name — A → Z</option>
                <option value="p1k_asc">Price (₦/1k) — Low → High</option>
                <option value="p10_asc">Price (₦/10) — Low → High</option>
                <option value="p1_asc">Price (₦/1) — Low → High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Min</th>
                  <th className="px-4 py-3">Max</th>
                  <th className="px-4 py-3">₦ / 1k</th>
                  <th className="px-4 py-3">₦ / 10</th>
                  <th className="px-4 py-3">₦ / 1</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={7}>
                      Loading services…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={7}>
                      No services match your filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => (
                    <tr
                      key={s.service}
                      className="border-b border-gray-100 hover:bg-gray-50/50 dark:border-gray-900 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.category}</td>
                      <td className="px-4 py-3">{s.min}</td>
                      <td className="px-4 py-3">{s.max}</td>
                      <td className="px-4 py-3">{fmt(s.priceNGN_1k)}</td>
                      <td className="px-4 py-3">{fmt(s.priceNGN_10)}</td>
                      <td className="px-4 py-3">{fmt(s.priceNGN_1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            Rate basis from provider is per 1000 units. Estimates shown include your configured
            NGN/USD and margin.
          </div>
        </div>
      </div>
    </>
  );
}