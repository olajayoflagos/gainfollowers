// app/og/route.js
export const runtime = 'edge';

import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const title =
    searchParams.get('title') ||
    'Gainfollowers – SMM Panel for Instagram, TikTok, X (Twitter), Facebook';

  const logoURL = `${origin}/gainfollowers-logo.svg`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #09090b 0%, #1f093a 40%, #5b22ff 100%)',
          color: '#fff',
          padding: '60px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(800px 400px at 10% 10%, rgba(255,255,255,0.15), transparent), radial-gradient(800px 400px at 90% 90%, rgba(91,34,255,0.3), transparent)',
            opacity: 0.9,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoURL}
            alt="Gainfollowers"
            width={72}
            height={72}
            style={{ borderRadius: 16, background: 'rgba(255,255,255,0.06)', padding: 10 }}
          />
          <div style={{ fontSize: 36, fontWeight: 700 }}>Gainfollowers</div>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 64,
            lineHeight: 1.1,
            fontWeight: 800,
            maxWidth: 980,
          }}
        >
          {title}
        </div>

        <div style={{ marginTop: 28, fontSize: 28, opacity: 0.95 }}>
          Fund NGN wallet with Paystack • Place orders instantly • JAP auto-fulfillment
        </div>

        <div style={{ marginTop: 'auto', fontSize: 24, opacity: 0.9 }}>
          gainfollowers.vercel.app
        </div>
      </div>
    ),
    size
  );
}