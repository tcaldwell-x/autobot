import { Metadata } from 'next';
import { decodeRecommendation, RecommendationData } from '@/lib/types';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

// Generate metadata with OG image
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = decodeRecommendation(params.id);
  
  if (!data) {
    return { title: 'Not Found' };
  }
  
  const title = `${data.destination} Travel Picks | AutoBot`;
  const description = data.hotel 
    ? `🏨 ${data.hotel.name} - ${data.hotel.price}${data.hotel.rating ? ` ⭐${data.hotel.rating}` : ''}`
    : `Travel recommendations for ${data.destination}`;
  
  // The OG image URL includes the encoded data
  const ogImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://autobot.vercel.app'}/api/og/${params.id}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${data.destination} recommendations`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function RecommendationPage({ params }: PageProps) {
  const data = decodeRecommendation(params.id);
  
  if (!data) {
    notFound();
  }
  
  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤖✈️</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {data.destination}
            </span>
          </h1>
          {data.checkin && data.checkout && (
            <p className="text-gray-400">
              {data.checkin} → {data.checkout}
            </p>
          )}
        </div>
        
        {/* Hotel Card */}
        {data.hotel && (
          <div className="bg-slate-800/70 rounded-2xl p-6 mb-6 border border-slate-700">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🏨</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">{data.hotel.name}</h2>
                <div className="flex items-center gap-3 text-gray-300 mb-3">
                  <span className="text-lg font-medium text-green-400">{data.hotel.price}</span>
                  {data.hotel.rating && (
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      {data.hotel.rating}
                    </span>
                  )}
                </div>
                {data.hotel.amenities && data.hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.hotel.amenities.slice(0, 4).map((amenity, i) => (
                      <span key={i} className="bg-slate-700 px-2 py-1 rounded text-sm text-gray-300">
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Activity Card */}
        {data.activity && (
          <div className="bg-slate-800/70 rounded-2xl p-6 mb-6 border border-slate-700">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🎯</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">{data.activity.title}</h2>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-lg font-medium text-green-400">{data.activity.price}</span>
                  {data.activity.duration && (
                    <span className="text-gray-400">• {data.activity.duration}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Book Now Button */}
        <a
          href={data.hotelUrl || data.searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-center py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] mb-4"
        >
          Book on Expedia →
        </a>
        
        {/* Search More */}
        <a
          href={data.searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-slate-700 hover:bg-slate-600 text-white text-center py-3 px-6 rounded-xl transition-colors"
        >
          See More Hotels in {data.destination}
        </a>
        
        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Expedia Group</p>
          {data.username && (
            <p className="mt-2">
              Requested by{' '}
              <a 
                href={`https://x.com/${data.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                @{data.username}
              </a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
