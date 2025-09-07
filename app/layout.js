// app/layout.js
import './globals.css';

const BASE =
  (process.env.NEXT_PUBLIC_BASE_URL || 'https://gainfollowers.vercel.app')
    .replace(/\/$/, ''); // ensure no trailing slash

export const metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'Gainfollowers — SMM Panel for Instagram, TikTok, X (Twitter), Facebook',
    template: '%s · Gainfollowers',
  },
  description:
    'Gainfollowers is a fast, secure SMM panel for Instagram, TikTok, X (Twitter), Facebook, YouTube and more. Fund an NGN wallet via Paystack, place orders instantly, and track everything in a beautiful dashboard.',
  keywords: [
    'SMM panel',
    'Instagram followers', 'Instagram likes', 'Instagram views',
    'TikTok followers', 'TikTok likes', 'TikTok views',
    'Twitter followers', 'X followers', 'Twitter likes',
    'Facebook likes', 'Facebook followers',
    'YouTube views', 'YouTube subscribers',
    'Telegram members', 'Discord members',
    'Spotify plays', 'Apple Music streams', 'Audiomack',
    'LinkedIn', 'Snapchat', 'Twitch',
    'Website traffic',
    'cheap SMM', 'Nigeria', 'Paystack', 'NGN wallet',
    'auto fulfillment', 'JAP API', 'social media growth',
  ],
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Gainfollowers',
    url: BASE,
    title: 'Gainfollowers | SMM Panel for Instagram, TikTok, X (Twitter), Facebook',
    description:
      'Boost your social media growth. Fund in NGN with Paystack, order likes/followers/views, and track orders in a sleek dashboard.',
    // Prefer a 1200x630 card (served by our /og route)
    images: [
      { url: `${BASE}/og`, width: 1200, height: 630, alt: 'Gainfollowers' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@gainfollowers',
    title: 'Gainfollowers | SMM Panel for Instagram, TikTok, X (Twitter), Facebook',
    description:
      'Buy followers, likes, and views securely with Paystack. NGN wallet, real-time orders, JAP auto-fulfillment.',
    images: [`${BASE}/og`],
  },
  verification: {
    // Google Search Console
    google: '_uMLmJq1iRcdK_XL0xbPFakZAzuyzEOKTpdsVUW7j7g',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/gainfollowers-32x32.png', sizes: '32x32', type: 'image/png' }, // optional if you add it later
      { url: '/gainfollowers-16x16.png', sizes: '16x16', type: 'image/png' }, // optional
      { url: '/gainfollowers-logo.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/gainfollowers-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/gainfollowers-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  category: 'technology',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gradient-to-b from-white to-violet-50/50 dark:from-gray-950 dark:to-gray-900">
        {children}
      </body>
    </html>
  );
}
