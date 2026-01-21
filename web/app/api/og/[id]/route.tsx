import { ImageResponse } from '@vercel/og';
import { Redis } from '@upstash/redis';
import { RecommendationData } from '@/lib/types';

export const runtime = 'edge';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let data: RecommendationData | null = null;
  try {
    const raw = await redis.get(`r:${params.id}`);
    if (raw) data = typeof raw === 'string' ? JSON.parse(raw) : raw as RecommendationData;
  } catch { /* ignore */ }
  
  if (!data) {
    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
          <div style={{ fontSize: 60 }}>🤖</div>
          <div style={{ fontSize: 32, color: 'white', marginTop: 20 }}>Not found</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e1b4b 100%)', padding: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: 50, marginRight: 16 }}>🤖✈️</span>
          <span style={{ fontSize: 36, fontWeight: 700, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', backgroundClip: 'text', color: 'transparent' }}>AutoBot</span>
        </div>

        <div style={{ fontSize: 72, fontWeight: 700, color: 'white', marginBottom: 40 }}>{data.destination}</div>

        {data.hotel && (
          <div style={{ display: 'flex', alignItems: 'flex-start', background: 'rgba(30, 41, 59, 0.8)', borderRadius: 20, padding: 30, marginTop: 'auto' }}>
            <span style={{ fontSize: 50, marginRight: 20 }}>🏨</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'white', marginBottom: 8 }}>{data.hotel.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 600, color: '#4ade80' }}>{data.hotel.price}</span>
                {data.hotel.rating && <span style={{ fontSize: 28, color: '#fbbf24' }}>⭐ {data.hotel.rating}</span>}
              </div>
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 30, right: 60, fontSize: 18, color: '#64748b' }}>Powered by Expedia</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
