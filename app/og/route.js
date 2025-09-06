import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Default size for OG images
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #2563eb, #9333ea)',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px',
        }}
      >
        <img
          src="https://gainfollowers.vercel.app/logo.png"
          alt="Gainfollowers Logo"
          width="160"
          height="160"
          style={{ marginBottom: '20px', borderRadius: '20px' }}
        />
        <h1 style={{ fontSize: 72, marginBottom: 20 }}>Gainfollowers</h1>
        <p style={{ fontSize: 40, maxWidth: '900px' }}>
          Boost your <b>Instagram</b>, <b>Twitter</b>, <b>Facebook</b>, and <b>TikTok</b> growth 🚀
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
