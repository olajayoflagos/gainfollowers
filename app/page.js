// app/page.js
import Link from 'next/link';

// Inline logo so you don’t need a file
function Logo({ size = 40 }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid place-items-center rounded-2xl"
        style={{ width: size + 20, height: size + 20, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M3 16l6-6 4 4 6-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-extrabold text-lg">Gainfollowers</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Header */}
      <header className="container py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link className="link" href="/services">Services</Link>
          <Link className="link" href="/pricing">Pricing</Link>
          <Link className="link" href="/login">Log in</Link>
          <Link className="btn-primary" href="/signup">Sign up</Link>
        </nav>
        <div className="md:hidden">
          <Link className="btn-ghost" href="/login">Menu</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-10 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="fade-in">
            <span className="badge">SMM PANEL • PAYSTACK • NGN WALLET</span>
            <h1 className="h1 mt-4">
              Grow faster on <span className="text-violet-600">Instagram</span>, <span className="text-violet-600">TikTok</span>,{' '}
              <span className="text-violet-600">Twitter/X</span> & <span className="text-violet-600">Facebook</span>.
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Fund instantly in NGN with Paystack. Place secure SMM orders for Instagram followers & likes, TikTok views, Twitter/X engagement,
              Facebook page likes, YouTube views and more. Real-time wallet & order tracking, JAP auto-fulfillment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">Get started</Link>
              <Link href="/services" className="btn-outline">Browse services</Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Trusted by creators, brands & agencies across Nigeria.
            </p>
          </div>

          {/* Mock dashboard preview */}
          <div className="fade-in">
            <div className="card p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <Logo size={26} />
                <span className="badge">Dashboard</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="surface rounded-xl p-4">
                  <div className="text-sm text-gray-500">Wallet (NGN)</div>
                  <div className="text-3xl font-extrabold mt-1">₦48,750</div>
                </div>
                <div className="surface rounded-xl p-4">
                  <div className="text-sm text-gray-500">Orders</div>
                  <div className="text-3xl font-extrabold mt-1">126</div>
                </div>
                <div className="surface rounded-xl p-4">
                  <div className="text-sm text-gray-500">Success rate</div>
                  <div className="text-3xl font-extrabold mt-1">99.3%</div>
                </div>
              </div>
              <div className="mt-6 h-40 rounded-xl bg-gradient-to-r from-violet-200 to-fuchsia-200 dark:from-violet-900/40 dark:to-fuchsia-900/40 grid place-items-center text-sm text-gray-600 dark:text-gray-300">
                Live analytics preview
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social logos */}
      <section className="container py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center text-gray-500">
          {['Instagram','TikTok','Twitter/X','Facebook','YouTube','Telegram'].map((n) => (
            <div key={n} className="surface rounded-xl py-3">{n}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-14">
        <h2 className="h2 text-center">Everything you need to scale social growth</h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mt-2">Fast delivery • Verified Paystack payments • Real-time wallet • 24/7 status</p>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="h-10 w-10 rounded-xl bg-violet-600/10 text-violet-600 grid place-items-center mb-3">⚡</div>
            <h3 className="h3">Instant NGN wallet</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Top up via Paystack; funds appear in seconds so you can place orders immediately.</p>
          </div>
          <div className="card p-6">
            <div className="h-10 w-10 rounded-xl bg-violet-600/10 text-violet-600 grid place-items-center mb-3">🛠️</div>
            <h3 className="h3">Auto-fulfillment (JAP)</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">We connect to JustAnotherPanel (JAP) for swift order placement and status updates.</p>
          </div>
          <div className="card p-6">
            <div className="h-10 w-10 rounded-xl bg-violet-600/10 text-violet-600 grid place-items-center mb-3">🔒</div>
            <h3 className="h3">Secure & compliant</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Encrypted payments through Paystack. Email notifications for receipts & updates.</p>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="container py-12">
        <div className="card p-6 md:p-10 text-center">
          <h2 className="h2">Simple pricing that scales with you</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Competitive rates across Instagram, TikTok, Twitter/X, Facebook, YouTube & more.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/signup" className="btn-primary">Create free account</Link>
            <Link href="/pricing" className="btn-outline">See pricing</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-14">
        <h2 className="h2 text-center">Frequently asked questions</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="h3">Which platforms do you support?</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Instagram, TikTok, Twitter/X, Facebook, YouTube, Telegram, Snapchat & LinkedIn. New services are added regularly.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="h3">How do payments work?</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Fund your NGN wallet using Paystack. Then place orders from your balance—no card re-entry required.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="h3">How fast is delivery?</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Most orders start within minutes via JAP and you can track progress live in your dashboard.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="h3">Do you send notifications?</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Yes—email receipts, order updates and deactivation confirmations are all wired.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-14">
        <div className="card p-8 text-center bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white">
          <h2 className="h2">Start growing today</h2>
          <p className="mt-2 text-white/90">Create your free account and place your first Instagram, TikTok or Twitter/X order in minutes.</p>
          <div className="mt-6">
            <Link href="/signup" className="btn bg-white text-violet-700 hover:opacity-90">Create free account</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-10 text-sm text-gray-500">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-gray-600">© {new Date().getFullYear()} Gainfollowers</span>
          </div>
          <nav className="flex gap-4">
            <Link className="link" href="/privacy">Privacy</Link>
            <Link className="link" href="/terms">Terms</Link>
            <Link className="link" href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Gainfollowers',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gainfollowers.vercel.app',
            sameAs: [
              'https://www.instagram.com', 'https://www.tiktok.com', 'https://twitter.com',
              'https://www.facebook.com', 'https://www.youtube.com'
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Gainfollowers',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gainfollowers.vercel.app',
            potentialAction: {
              '@type': 'SearchAction',
              target: '/services?q={query}',
              'query-input': 'required name=query',
            },
          }),
        }}
      />
    </>
  );
}
