/**
 * Recommendation data that gets encoded in the URL
 */
export interface RecommendationData {
  // Destination info
  destination: string;
  checkin?: string;
  checkout?: string;
  
  // Hotel recommendation
  hotel?: {
    name: string;
    price: string;
    rating?: number;
    amenities?: string[];
  };
  
  // Activity recommendation
  activity?: {
    title: string;
    price: string;
    duration?: string;
  };
  
  // Booking URLs
  hotelUrl?: string;
  searchUrl: string;
  
  // Tweet context
  tweetId?: string;
  username?: string;
}

/**
 * Encode recommendation data for URL
 */
export function encodeRecommendation(data: RecommendationData): string {
  const json = JSON.stringify(data);
  // Use base64url encoding (URL-safe)
  return Buffer.from(json).toString('base64url');
}

/**
 * Decode recommendation data from URL
 */
export function decodeRecommendation(encoded: string): RecommendationData | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
