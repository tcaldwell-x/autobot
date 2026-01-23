import { ImageResponse } from '@vercel/og';
import { Redis } from '@upstash/redis';
import { RecommendationData } from '@/lib/types';

export const runtime = 'edge';

// Branding config (edge runtime can't use Node.js modules, so we inline the config)
// Default colors based on OpenTable brand: Red #DA3743, White, Dark
const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'BookingBot',
  logo: process.env.NEXT_PUBLIC_BRAND_LOGO || '🍽️',
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#DA3743',
  secondaryColor: process.env.NEXT_PUBLIC_BRAND_SECONDARY_COLOR || '#DA3743',
  backgroundGradient: process.env.NEXT_PUBLIC_BRAND_BG_GRADIENT || 
    'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
  textGradient: process.env.NEXT_PUBLIC_BRAND_TEXT_GRADIENT || 
    'linear-gradient(90deg, #DA3743, #ff6b6b)',
  cardBackground: process.env.NEXT_PUBLIC_BRAND_CARD_BG || 'rgba(45, 45, 45, 0.9)',
  accentColor: process.env.NEXT_PUBLIC_BRAND_ACCENT_COLOR || '#ffffff',
  poweredBy: process.env.NEXT_PUBLIC_BRAND_POWERED_BY || 'Powered by OpenTable',
};

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let data: RecommendationData | null = null;
  try {
    const raw = await redis.get(`r:${params.id}`);
    console.log(`[OG] Fetched data for ${params.id}:`, raw ? 'found' : 'not found');
    if (raw) {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw as RecommendationData;
      console.log(`[OG] Data type: ${data?.type}, hasReservation: ${!!data?.reservation}`);
    }
  } catch (err) {
    console.error(`[OG] Redis error for ${params.id}:`, err);
  }
  
  // Not found state
  if (!data) {
    return new ImageResponse(
      (
        <div style={{ 
          height: '100%', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: brand.backgroundGradient,
        }}>
          <div style={{ display: 'flex', fontSize: 80 }}>{brand.logo}</div>
          <div style={{ display: 'flex', fontSize: 36, color: 'white', marginTop: 20, fontWeight: 600 }}>{brand.name}</div>
          <div style={{ display: 'flex', fontSize: 24, color: '#94a3b8', marginTop: 10 }}>Reservation not found</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const isReservation = !!data.reservation;

  // Reservation confirmation OG image
  if (isReservation && data.reservation) {
    return new ImageResponse(
      (
        <div style={{ 
          height: '100%', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          background: brand.backgroundGradient, 
          padding: 60,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 50, marginRight: 16 }}>{brand.logo}</span>
            <span style={{ 
              fontSize: 32, 
              fontWeight: 700, 
              background: brand.textGradient, 
              backgroundClip: 'text', 
              color: 'transparent',
            }}>
              {brand.name}
            </span>
          </div>

          {/* Restaurant Name */}
          <div style={{ 
            display: 'flex',
            fontSize: 56, 
            fontWeight: 700, 
            color: 'white', 
            marginBottom: 8,
          }}>
            {data.reservation.restaurant_name}
          </div>
          
          {/* Cuisine & Neighborhood */}
          <div style={{ 
            display: 'flex',
            fontSize: 24, 
            color: '#9ca3af', 
            marginBottom: 30,
          }}>
            {data.reservation.cuisine}{data.reservation.neighborhood ? ` • ${data.reservation.neighborhood}` : ''}
          </div>

          {/* Reservation Details Card */}
          <div style={{ 
            display: 'flex', 
            background: brand.cardBackground, 
            borderRadius: 20, 
            padding: 30,
            marginTop: 'auto',
            marginBottom: 40,
            border: `2px solid ${brand.secondaryColor}`,
          }}>
            {/* Date */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, color: '#9ca3af', marginBottom: 4 }}>Date</span>
              <span style={{ fontSize: 28, fontWeight: 600, color: 'white' }}>
                📅 {data.reservation.date_formatted}
              </span>
            </div>
            
            {/* Time */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, color: '#9ca3af', marginBottom: 4 }}>Time</span>
              <span style={{ fontSize: 28, fontWeight: 600, color: 'white' }}>
                🕐 {data.reservation.time_formatted}
              </span>
            </div>
            
            {/* Party Size */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, color: '#9ca3af', marginBottom: 4 }}>Party</span>
              <span style={{ fontSize: 28, fontWeight: 600, color: 'white' }}>
                👥 {data.reservation.party_size} guests
              </span>
            </div>
            
            {/* Confirmation */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, color: '#9ca3af', marginBottom: 4 }}>Confirmation</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: brand.secondaryColor }}>
                {data.reservation.confirmation_number}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            display: 'flex',
            position: 'absolute', 
            bottom: 30, 
            right: 60, 
            fontSize: 18, 
            color: '#64748b',
          }}>
            {brand.poweredBy}
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Travel recommendation OG image (existing logic)
  const hasHotel = !!data.hotel;
  const hasActivity = !!data.activity;
  const hasBothItems = hasHotel && hasActivity;

  return new ImageResponse(
    (
      <div style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        background: brand.backgroundGradient, 
        padding: 60,
      }}>
        {/* Header with logo and brand name */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
          <span style={{ fontSize: 50, marginRight: 16 }}>{brand.logo}</span>
          <span style={{ 
            fontSize: 36, 
            fontWeight: 700, 
            background: brand.textGradient, 
            backgroundClip: 'text', 
            color: 'transparent',
          }}>
            {brand.name}
          </span>
        </div>

        {/* Destination */}
        <div style={{ 
          display: 'flex',
          fontSize: 72, 
          fontWeight: 700, 
          color: 'white', 
          marginBottom: 30,
        }}>
          {data.destination}
        </div>

        {/* Recommendations - flexible layout */}
        <div style={{ 
          display: 'flex', 
          flexDirection: hasBothItems ? 'row' : 'column',
          gap: 20, 
          marginTop: 'auto',
          marginBottom: 40,
        }}>
          {/* Hotel card */}
          {data.hotel && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              background: brand.cardBackground, 
              borderRadius: 20, 
              padding: 24,
              flex: hasBothItems ? 1 : 'none',
              border: `2px solid rgba(218, 55, 67, 0.3)`,
            }}>
              <span style={{ fontSize: 40, marginRight: 16 }}>🏨</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  display: 'flex',
                  fontSize: hasBothItems ? 24 : 32, 
                  fontWeight: 600, 
                  color: 'white', 
                  marginBottom: 6,
                }}>
                  {data.hotel.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ 
                    fontSize: hasBothItems ? 24 : 28, 
                    fontWeight: 700, 
                    color: brand.secondaryColor,
                  }}>
                    {data.hotel.price}
                  </span>
                  {data.hotel.rating && (
                    <span style={{ fontSize: hasBothItems ? 20 : 24, color: brand.secondaryColor }}>
                      ⭐ {data.hotel.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity card */}
          {data.activity && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              background: brand.cardBackground, 
              borderRadius: 20, 
              padding: 24,
              flex: hasBothItems ? 1 : 'none',
              border: `2px solid rgba(218, 55, 67, 0.3)`,
            }}>
              <span style={{ fontSize: 40, marginRight: 16 }}>🎯</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  display: 'flex',
                  fontSize: hasBothItems ? 24 : 32, 
                  fontWeight: 600, 
                  color: 'white', 
                  marginBottom: 6,
                }}>
                  {data.activity.title}
                </div>
                <span style={{ 
                  fontSize: hasBothItems ? 24 : 28, 
                  fontWeight: 700, 
                  color: brand.secondaryColor,
                }}>
                  {data.activity.price}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex',
          position: 'absolute', 
          bottom: 30, 
          right: 60, 
          fontSize: 18, 
          color: '#64748b',
        }}>
          {brand.poweredBy}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
