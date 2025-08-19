import './globals.css';

export const metadata = {
  title: 'Gainfollowers — SMM Reseller Panel',
  description: 'Next.js + Firebase + Paystack + JAP',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-800 dark:bg-gray-950 dark:text-gray-100">
        <script dangerouslySetInnerHTML={{__html:`
          try {
            const t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch {}
        `}}/>
        {children}
      </body>
    </html>
  );
}
