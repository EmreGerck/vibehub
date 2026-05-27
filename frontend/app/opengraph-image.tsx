import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeHub — Sanatçıların Resmi Ürünleri | Sahnen Senin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0B1022 0%, #1a0533 40%, #2d0a4e 70%, #0B1022 100%)',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(90deg, #a855f7, #ec4899)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
          }}
        >
          VibeHub
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            letterSpacing: '0.05em',
          }}
        >
          Sanatçıların Resmi Ürünleri — Sahnen Senin
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #a855f7, #ec4899, #a855f7)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
