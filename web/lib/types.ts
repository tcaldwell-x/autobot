/**
 * Generic storable data for any plugin type
 * Supports travel recommendations, restaurant reservations, etc.
 */
export interface RecommendationData {
  // Common fields
  destination: string;  // Primary title (destination, restaurant name, etc.)
  searchUrl: string;    // Action URL
  createdAt: number;
  
  // Type indicator
  type?: 'travel' | 'reservation' | 'search';
  
  // Travel (Expedia) fields
  hotel?: {
    name: string;
    price: string;
    rating?: number;
  };
  activity?: {
    title: string;
    price: string;
  };
  
  // Reservation (OpenTable) fields
  reservation?: {
    confirmation_number: string;
    restaurant_name: string;
    cuisine?: string;
    neighborhood?: string;
    address?: string;
    phone?: string;
    date: string;
    date_formatted: string;
    time: string;
    time_formatted: string;
    party_size: number;
    rating?: number;
    price_range?: string;
    special_requests?: string;
  };
}

/**
 * Generate a short unique ID (8 chars)
 */
export function generateShortId(): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
