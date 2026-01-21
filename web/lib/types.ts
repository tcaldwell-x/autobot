/**
 * Compact data encoded in URL
 */
export interface CompactData {
  d: string;        // destination
  h?: string;       // hotel name
  p?: number;       // hotel price
  r?: number;       // hotel rating
  a?: string;       // activity title
  ap?: number;      // activity price
}

/**
 * Full recommendation data for display
 */
export interface RecommendationData {
  destination: string;
  hotel?: {
    name: string;
    price: string;
    rating?: number;
  };
  activity?: {
    title: string;
    price: string;
  };
  searchUrl: string;
}

/**
 * Decode compact data from URL and expand to full data
 */
export function decodeRecommendation(encoded: string): RecommendationData | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const compact: CompactData = JSON.parse(json);
    
    const destination = compact.d;
    const searchUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination)}`;
    
    const data: RecommendationData = {
      destination,
      searchUrl,
    };
    
    if (compact.h) {
      data.hotel = {
        name: compact.h,
        price: `$${compact.p}/night`,
        rating: compact.r,
      };
    }
    
    if (compact.a) {
      data.activity = {
        title: compact.a,
        price: `$${compact.ap}`,
      };
    }
    
    return data;
  } catch {
    return null;
  }
}
