// app/layout.js
import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://gainfollowers.vercel.app'),
  title: {
    default: 'Gainfollowers — SMM Panel for Instagram, TikTok, Twitter/X, Facebook',
    template: '%s · Gainfollowers',
  },
  description:
    'Boost your Instagram, Twitter, and Facebook growth with Gainfollowers. Fund wallet in NGN, order likes, followers, views, and track everything in a sleek dashboard.',
  icons: {
    icon: '/favicon.ico',
  },
  keywords: [
    'SMM panel', 'Instagram followers', 'Instagram likes', 'TikTok followers',
    'Twitter followers', 'Twitter/X likes', 'Facebook likes', 'YouTube views',
    'Snapchat', 'Telegram', 'LinkedIn', 'cheap SMM', 'Paystack Nigeria',
    'NGN wallet', 'social media growth', 'auto fulfilment', 'JAP API',
  ],
  alternates: { canonical: '/' },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'Gainfollowers | Grow Faster on Instagram, Twitter & Facebook',
    description:
      'All-in-one SMM panel for Instagram, Twitter, and Facebook growth. Safe Paystack payments, fast auto-fulfillment, wallet tracking.',
    url: 'https://gainfollowers.vercel.app',
    siteName: 'Gainfollowers',
    images: [
      {
        url: '/gainfollowers-logo.svg',
        width: 512,
        height: 512,
        alt: 'Gainfollowers Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gainfollowers | SMM Panel for Instagram, Twitter, Facebook',
    description:
      'Buy followers, likes, and views on Instagram, Twitter, Facebook securely. Fund with Paystack and track in your NGN wallet.',
    images: ['/gainfollowers-logo.svg'],
  },
  // Put your Google Search Console token here
  verification: {
    google: '_uMLmJq1iRcdK_XL0xbPFakZAzuyzEOKTpdsVUW7j7g',
  },
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
