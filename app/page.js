import NavBar from './components/NavBar';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <NavBar/>
      <section className="hero-gradient">
        <div className="container py-20 text-center">
          <span className="badge mb-4">New</span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">A polished SMM reseller panel</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">Speed • Paystack wallet • JAP auto‑fulfillment • Auth & Mails</p>
          <div className="mt-8 flex items-center gap-3 justify-center">
            <Link href="/signup" className="btn-primary h-12 px-6 text-base">Get started</Link>
            <Link href="/services" className="btn-outline h-12 px-6 text-base">Browse services</Link>
          </div>
        </div>
      </section>
      <main className="container grid md:grid-cols-3 gap-6">
        {[
          ['Fast & Reliable', 'Services rendered are fast and reliable with every penny worth.'],
          ['Paystack Wallet', 'Customers fund NGN wallet; we auto‑place JAP orders from your balance.'],
          ['Emails & Webhooks', 'Welcome, receipts, order updates, deactivation—all wired.']
        ].map(([title,desc]) => (
          <div key={title} className="card p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{desc}</p>
          </div>
        ))}
      </main>
      <footer className="container py-10 text-sm text-gray-500 flex justify-between">
        <span>© {new Date().getFullYear()} Gainfollowers</span>
        <div className="flex gap-4">
          <a href="/sitemap.xml">Sitemap</a><a href="/robots.txt">Robots</a>
        </div>
      </footer>
    </>
  );
}
