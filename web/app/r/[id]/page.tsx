import { Metadata } from 'next';
import { redis } from '@/lib/redis';
import { RecommendationData } from '@/lib/types';
import { branding } from '@/lib/config';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

async function getData(id: string): Promise<RecommendationData | null> {
  try {
    const data = await redis.get(`r:${id}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as RecommendationData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getData(params.id);
  
  if (!data) return { title: 'Not Found' };
  
  let title: string;
  let description: string;
  
  if (data.reservation) {
    title = `Reservation at ${data.reservation.restaurant_name} | ${branding.name}`;
    description = `🍽️ Table for ${data.reservation.party_size} on ${data.reservation.date_formatted} at ${data.reservation.time_formatted}`;
  } else {
    title = `${data.destination} | ${branding.name}`;
    description = '';
    if (data.hotel) {
      description += `🏨 ${data.hotel.name} - ${data.hotel.price}`;
      if (data.hotel.rating) description += ` ⭐${data.hotel.rating}`;
    }
    if (data.activity) {
      if (description) description += ' | ';
      description += `🎯 ${data.activity.title} - ${data.activity.price}`;
    }
    if (!description) {
      description = `Travel recommendations for ${data.destination}`;
    }
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://autobot-five.vercel.app';
  const ogImageUrl = `${baseUrl}/api/og/${params.id}`;
  
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogImageUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImageUrl] },
  };
}

export default async function RecommendationPage({ params }: PageProps) {
  const data = await getData(params.id);
  
  if (!data) notFound();
  
  const isReservation = !!data.reservation;
  
  return (
    <main 
      className="min-h-screen relative overflow-hidden"
      style={{ background: branding.backgroundGradient }}
    >
      {/* Ambient background glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${branding.secondaryColor} 0%, transparent 70%)` }}
      />
      
      <div className="relative z-10 px-6 py-12 md:py-20">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <span className="text-2xl">{branding.logo}</span>
              <span 
                className="text-sm font-semibold tracking-wide"
                style={{ 
                  background: branding.textGradient, 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {branding.name}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              {isReservation ? data.reservation!.restaurant_name : data.destination}
            </h1>
            
            {isReservation && data.reservation!.cuisine && (
              <p className="text-gray-400 font-medium">
                {data.reservation!.cuisine}
                {data.reservation!.neighborhood && ` · ${data.reservation!.neighborhood}`}
              </p>
            )}
          </header>
          
          {/* Reservation Content */}
          {isReservation && data.reservation && (
            <div className="space-y-4">
              {/* Confirmation Badge */}
              <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6">
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{ background: `linear-gradient(135deg, ${branding.secondaryColor} 0%, transparent 50%)` }}
                />
                <div className="relative text-center">
                  <div className="text-[11px] text-gray-500 uppercase tracking-[0.2em] font-semibold mb-3">
                    Confirmation
                  </div>
                  <div 
                    className="text-2xl md:text-3xl font-bold tracking-wide"
                    style={{ color: branding.secondaryColor }}
                  >
                    {data.reservation.confirmation_number}
                  </div>
                </div>
              </div>
              
              {/* Reservation Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <DetailCard 
                  label="Date" 
                  value={data.reservation.date_formatted}
                  icon="📅"
                />
                <DetailCard 
                  label="Time" 
                  value={data.reservation.time_formatted}
                  icon="🕐"
                />
                <DetailCard 
                  label="Party Size" 
                  value={`${data.reservation.party_size} ${data.reservation.party_size === 1 ? 'guest' : 'guests'}`}
                  icon="👥"
                />
                <DetailCard 
                  label="Price Range" 
                  value={data.reservation.price_range || '$$$'}
                  icon="💎"
                  highlight
                />
              </div>
              
              {/* Special Requests */}
              {data.reservation.special_requests && (
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5">
                  <div className="text-[11px] text-gray-500 uppercase tracking-[0.15em] font-semibold mb-2">
                    Special Requests
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {data.reservation.special_requests}
                  </p>
                </div>
              )}
              
              {/* Restaurant Info */}
              {(data.reservation.address || data.reservation.phone) && (
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 space-y-3">
                  {data.reservation.address && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg opacity-60">📍</span>
                      <span className="text-white/80 text-sm">{data.reservation.address}</span>
                    </div>
                  )}
                  {data.reservation.phone && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg opacity-60">📞</span>
                      <a 
                        href={`tel:${data.reservation.phone}`} 
                        className="text-white/80 text-sm hover:text-white transition-colors"
                      >
                        {data.reservation.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Travel Content */}
          {!isReservation && (
            <div className="space-y-4">
              {data.hotel && (
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                      🏨
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-white truncate mb-1">
                        {data.hotel.name}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span 
                          className="text-lg font-bold"
                          style={{ color: branding.secondaryColor }}
                        >
                          {data.hotel.price}
                        </span>
                        {data.hotel.rating && (
                          <span className="flex items-center gap-1 text-sm text-white/60">
                            <span className="text-yellow-500">★</span>
                            {data.hotel.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {data.activity && (
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                      🎯
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-white truncate mb-1">
                        {data.activity.title}
                      </h2>
                      <span 
                        className="text-lg font-bold"
                        style={{ color: branding.secondaryColor }}
                      >
                        {data.activity.price}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* CTA Button */}
          <div className="mt-8">
            <a
              href={data.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block w-full overflow-hidden rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div 
                className="absolute inset-0 transition-opacity group-hover:opacity-90"
                style={{ background: branding.buttonGradient }}
              />
              <div className="relative px-6 py-4 text-center">
                <span className="font-semibold text-white tracking-wide">
                  {branding.ctaText}
                </span>
              </div>
            </a>
          </div>
          
          {/* Footer */}
          <footer className="mt-12 text-center">
            <a 
              href={branding.poweredByUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors tracking-wide"
            >
              {branding.poweredBy}
            </a>
          </footer>
        </div>
      </div>
    </main>
  );
}

function DetailCard({ 
  label, 
  value, 
  icon, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-4">
      <div className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold mb-2">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base opacity-60">{icon}</span>
        <span 
          className={`font-semibold truncate ${highlight ? '' : 'text-white'}`}
          style={highlight ? { color: branding.secondaryColor } : undefined}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
