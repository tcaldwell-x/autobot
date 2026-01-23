/**
 * OpenTable Restaurant Reservation Plugin
 * 
 * A bot that helps users find restaurants and make reservations.
 * Powered by OpenTable API (sandbox mode for testing).
 */

import { BotPlugin, PluginConfig, ToolContext, ToolResult, Tool, StorableData } from '../../framework/types';

/**
 * System prompt for the restaurant reservation assistant
 */
const SYSTEM_PROMPT = `You are a restaurant reservation assistant on X (Twitter).

CRITICAL RULES:

1. ALWAYS USE TOOLS when suggesting restaurants:
   - search_restaurants: MUST call this when suggesting ANY restaurant (new or alternative)
   - make_reservation: MUST call this when user confirms booking
   - check_availability: Check specific restaurant times
   
2. NEVER suggest a restaurant without calling search_restaurants first
   - Even for follow-up suggestions ("another option"), call search_restaurants again
   - The tool provides the link preview - without it, there's no link!

3. NEVER say "Booked!" without calling make_reservation
   - The confirmation number comes from the tool result
   - Don't make up confirmation numbers

RESPONSE LIMITS:
- Max 150 characters when using tools (link gets appended)
- Max 250 characters for general conversation (no tools)

FLOW:
1. User wants restaurant → call search_restaurants → suggest ONE option with name, time, rating
2. User says "no" or "another" → call search_restaurants AGAIN → suggest different option
3. User confirms → call make_reservation → confirm with details from tool

NEVER:
- Include URLs - system adds them automatically
- List multiple options - pick ONE best match
- Respond about restaurants without calling search_restaurants
- Confirm bookings without calling make_reservation`;

/**
 * Tool definitions for OpenTable
 */
const TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_restaurants',
      description: 'Search for restaurants by location, cuisine, date, time, and party size. Use this to find available restaurants.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City or neighborhood (e.g., "New York", "Manhattan", "San Francisco")',
          },
          cuisine: {
            type: 'string',
            description: 'Type of cuisine (e.g., "Italian", "Japanese", "Steakhouse", "Mexican")',
          },
          date: {
            type: 'string',
            description: 'Date for reservation in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'Preferred time in HH:MM format (24-hour), e.g., "19:00" for 7 PM',
          },
          party_size: {
            type: 'number',
            description: 'Number of guests (1-20)',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'make_reservation',
      description: 'Make a reservation at a specific restaurant. Use this after the user confirms which restaurant they want.',
      parameters: {
        type: 'object',
        properties: {
          restaurant_id: {
            type: 'string',
            description: 'The restaurant ID from search results',
          },
          restaurant_name: {
            type: 'string',
            description: 'Name of the restaurant',
          },
          date: {
            type: 'string',
            description: 'Date for reservation in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'Time for reservation in HH:MM format (24-hour)',
          },
          party_size: {
            type: 'number',
            description: 'Number of guests',
          },
          special_requests: {
            type: 'string',
            description: 'Any special requests (birthday, anniversary, dietary restrictions)',
          },
        },
        required: ['restaurant_id', 'restaurant_name', 'date', 'time', 'party_size'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check available time slots for a specific restaurant.',
      parameters: {
        type: 'object',
        properties: {
          restaurant_id: {
            type: 'string',
            description: 'The restaurant ID',
          },
          date: {
            type: 'string',
            description: 'Date to check in YYYY-MM-DD format',
          },
          party_size: {
            type: 'number',
            description: 'Number of guests',
          },
        },
        required: ['restaurant_id', 'date', 'party_size'],
      },
    },
  },
];

// Sandbox restaurant data
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  city: string;
  rating: number;
  reviews: number;
  price_range: string;
  address: string;
  phone: string;
  image_url: string;
  available_times: string[];
}

interface Reservation {
  confirmation_number: string;
  restaurant: Restaurant;
  date: string;
  time: string;
  party_size: number;
  special_requests?: string;
}

// Sandbox data by city
const restaurantData: Record<string, Restaurant[]> = {
  'new york': [
    {
      id: 'ot-carbone-nyc',
      name: 'Carbone',
      cuisine: 'Italian',
      neighborhood: 'Greenwich Village',
      city: 'New York',
      rating: 4.8,
      reviews: 2847,
      price_range: '$$$$',
      address: '181 Thompson St, New York, NY 10012',
      phone: '(212) 254-3000',
      image_url: 'https://images.opentable.com/carbone-nyc.jpg',
      available_times: ['17:30', '18:00', '19:30', '20:00', '21:00'],
    },
    {
      id: 'ot-lespinasse-nyc',
      name: 'Le Bernardin',
      cuisine: 'French Seafood',
      neighborhood: 'Midtown',
      city: 'New York',
      rating: 4.9,
      reviews: 3421,
      price_range: '$$$$',
      address: '155 W 51st St, New York, NY 10019',
      phone: '(212) 554-1515',
      image_url: 'https://images.opentable.com/le-bernardin.jpg',
      available_times: ['17:00', '18:30', '19:00', '20:30', '21:30'],
    },
    {
      id: 'ot-gramercy-nyc',
      name: 'Gramercy Tavern',
      cuisine: 'American',
      neighborhood: 'Gramercy',
      city: 'New York',
      rating: 4.7,
      reviews: 4532,
      price_range: '$$$',
      address: '42 E 20th St, New York, NY 10003',
      phone: '(212) 477-0777',
      image_url: 'https://images.opentable.com/gramercy-tavern.jpg',
      available_times: ['17:00', '17:30', '18:00', '19:00', '19:30', '20:00', '21:00'],
    },
    {
      id: 'ot-su-nyc',
      name: 'Sushi Nakazawa',
      cuisine: 'Japanese',
      neighborhood: 'West Village',
      city: 'New York',
      rating: 4.9,
      reviews: 1893,
      price_range: '$$$$',
      address: '23 Commerce St, New York, NY 10014',
      phone: '(212) 924-2212',
      image_url: 'https://images.opentable.com/sushi-nakazawa.jpg',
      available_times: ['17:30', '18:00', '20:00', '20:30'],
    },
    {
      id: 'ot-tacos-nyc',
      name: 'Los Tacos No. 1',
      cuisine: 'Mexican',
      neighborhood: 'Chelsea',
      city: 'New York',
      rating: 4.6,
      reviews: 5621,
      price_range: '$',
      address: '75 9th Ave, New York, NY 10011',
      phone: '(212) 256-0343',
      image_url: 'https://images.opentable.com/los-tacos.jpg',
      available_times: ['11:00', '12:00', '13:00', '18:00', '19:00', '20:00'],
    },
    {
      id: 'ot-peters-nyc',
      name: 'Peter Luger Steak House',
      cuisine: 'Steakhouse',
      neighborhood: 'Williamsburg',
      city: 'New York',
      rating: 4.5,
      reviews: 7832,
      price_range: '$$$$',
      address: '178 Broadway, Brooklyn, NY 11211',
      phone: '(718) 387-7400',
      image_url: 'https://images.opentable.com/peter-luger.jpg',
      available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'],
    },
  ],
  'san francisco': [
    {
      id: 'ot-atelier-sf',
      name: 'Atelier Crenn',
      cuisine: 'French',
      neighborhood: 'Cow Hollow',
      city: 'San Francisco',
      rating: 4.9,
      reviews: 1243,
      price_range: '$$$$',
      address: '3127 Fillmore St, San Francisco, CA 94123',
      phone: '(415) 440-0460',
      image_url: 'https://images.opentable.com/atelier-crenn.jpg',
      available_times: ['17:30', '18:00', '20:00', '20:30'],
    },
    {
      id: 'ot-kokkari-sf',
      name: 'Kokkari Estiatorio',
      cuisine: 'Greek',
      neighborhood: 'Financial District',
      city: 'San Francisco',
      rating: 4.7,
      reviews: 3892,
      price_range: '$$$',
      address: '200 Jackson St, San Francisco, CA 94111',
      phone: '(415) 981-0983',
      image_url: 'https://images.opentable.com/kokkari.jpg',
      available_times: ['17:00', '18:00', '18:30', '19:00', '20:00', '21:00'],
    },
    {
      id: 'ot-lazy-sf',
      name: 'Lazy Bear',
      cuisine: 'American',
      neighborhood: 'Mission District',
      city: 'San Francisco',
      rating: 4.8,
      reviews: 2156,
      price_range: '$$$$',
      address: '3416 19th St, San Francisco, CA 94110',
      phone: '(415) 874-9921',
      image_url: 'https://images.opentable.com/lazy-bear.jpg',
      available_times: ['18:00', '20:30'],
    },
    {
      id: 'ot-tacolicious-sf',
      name: 'Tacolicious',
      cuisine: 'Mexican',
      neighborhood: 'Marina',
      city: 'San Francisco',
      rating: 4.4,
      reviews: 4521,
      price_range: '$$',
      address: '2031 Chestnut St, San Francisco, CA 94123',
      phone: '(415) 346-1966',
      image_url: 'https://images.opentable.com/tacolicious.jpg',
      available_times: ['11:30', '12:00', '17:00', '18:00', '19:00', '20:00'],
    },
  ],
  'los angeles': [
    {
      id: 'ot-bestia-la',
      name: 'Bestia',
      cuisine: 'Italian',
      neighborhood: 'Arts District',
      city: 'Los Angeles',
      rating: 4.7,
      reviews: 5432,
      price_range: '$$$',
      address: '2121 E 7th Pl, Los Angeles, CA 90021',
      phone: '(213) 514-5724',
      image_url: 'https://images.opentable.com/bestia-la.jpg',
      available_times: ['17:00', '17:30', '18:00', '19:00', '20:00', '21:00'],
    },
    {
      id: 'ot-providence-la',
      name: 'Providence',
      cuisine: 'Seafood',
      neighborhood: 'Hollywood',
      city: 'Los Angeles',
      rating: 4.8,
      reviews: 2876,
      price_range: '$$$$',
      address: '5955 Melrose Ave, Los Angeles, CA 90038',
      phone: '(323) 460-4170',
      image_url: 'https://images.opentable.com/providence-la.jpg',
      available_times: ['17:30', '18:00', '20:00', '20:30'],
    },
    {
      id: 'ot-nobu-la',
      name: 'Nobu Malibu',
      cuisine: 'Japanese',
      neighborhood: 'Malibu',
      city: 'Los Angeles',
      rating: 4.6,
      reviews: 6234,
      price_range: '$$$$',
      address: '22706 Pacific Coast Hwy, Malibu, CA 90265',
      phone: '(310) 317-9140',
      image_url: 'https://images.opentable.com/nobu-malibu.jpg',
      available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'],
    },
    {
      id: 'ot-guelaguetza-la',
      name: 'Guelaguetza',
      cuisine: 'Mexican',
      neighborhood: 'Koreatown',
      city: 'Los Angeles',
      rating: 4.5,
      reviews: 3892,
      price_range: '$$',
      address: '3014 W Olympic Blvd, Los Angeles, CA 90006',
      phone: '(213) 427-0608',
      image_url: 'https://images.opentable.com/guelaguetza.jpg',
      available_times: ['11:00', '12:00', '17:00', '18:00', '19:00', '20:00'],
    },
  ],
  'chicago': [
    {
      id: 'ot-alinea-chi',
      name: 'Alinea',
      cuisine: 'American',
      neighborhood: 'Lincoln Park',
      city: 'Chicago',
      rating: 4.9,
      reviews: 2134,
      price_range: '$$$$',
      address: '1723 N Halsted St, Chicago, IL 60614',
      phone: '(312) 867-0110',
      image_url: 'https://images.opentable.com/alinea.jpg',
      available_times: ['17:00', '17:30', '20:00', '20:30'],
    },
    {
      id: 'ot-giordanos-chi',
      name: "Giordano's",
      cuisine: 'Italian',
      neighborhood: 'Loop',
      city: 'Chicago',
      rating: 4.4,
      reviews: 8932,
      price_range: '$$',
      address: '130 E Randolph St, Chicago, IL 60601',
      phone: '(312) 616-1200',
      image_url: 'https://images.opentable.com/giordanos.jpg',
      available_times: ['11:00', '12:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
    },
    {
      id: 'ot-frontera-chi',
      name: 'Frontera Grill',
      cuisine: 'Mexican',
      neighborhood: 'River North',
      city: 'Chicago',
      rating: 4.6,
      reviews: 4521,
      price_range: '$$$',
      address: '445 N Clark St, Chicago, IL 60654',
      phone: '(312) 661-1434',
      image_url: 'https://images.opentable.com/frontera.jpg',
      available_times: ['17:00', '18:00', '19:00', '20:00'],
    },
  ],
  'miami': [
    {
      id: 'ot-juvia-mia',
      name: 'Juvia',
      cuisine: 'French-Japanese-Peruvian',
      neighborhood: 'South Beach',
      city: 'Miami',
      rating: 4.5,
      reviews: 3421,
      price_range: '$$$$',
      address: '1111 Lincoln Rd, Miami Beach, FL 33139',
      phone: '(305) 763-8272',
      image_url: 'https://images.opentable.com/juvia.jpg',
      available_times: ['18:00', '19:00', '20:00', '21:00', '22:00'],
    },
    {
      id: 'ot-mandolin-mia',
      name: 'Mandolin Aegean Bistro',
      cuisine: 'Greek',
      neighborhood: 'Design District',
      city: 'Miami',
      rating: 4.7,
      reviews: 2876,
      price_range: '$$$',
      address: '4312 NE 2nd Ave, Miami, FL 33137',
      phone: '(305) 576-6066',
      image_url: 'https://images.opentable.com/mandolin.jpg',
      available_times: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00'],
    },
    {
      id: 'ot-versailles-mia',
      name: 'Versailles Restaurant',
      cuisine: 'Cuban',
      neighborhood: 'Little Havana',
      city: 'Miami',
      rating: 4.3,
      reviews: 7654,
      price_range: '$$',
      address: '3555 SW 8th St, Miami, FL 33135',
      phone: '(305) 444-0240',
      image_url: 'https://images.opentable.com/versailles.jpg',
      available_times: ['11:00', '12:00', '13:00', '17:00', '18:00', '19:00', '20:00'],
    },
  ],
};

// Default restaurants for unknown cities
const defaultRestaurants: Restaurant[] = [
  {
    id: 'ot-default-italian',
    name: 'Trattoria Roma',
    cuisine: 'Italian',
    neighborhood: 'Downtown',
    city: 'City Center',
    rating: 4.5,
    reviews: 1234,
    price_range: '$$$',
    address: '123 Main St',
    phone: '(555) 123-4567',
    image_url: 'https://images.opentable.com/default-italian.jpg',
    available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'],
  },
  {
    id: 'ot-default-american',
    name: 'The Local Kitchen',
    cuisine: 'American',
    neighborhood: 'Downtown',
    city: 'City Center',
    rating: 4.4,
    reviews: 2345,
    price_range: '$$',
    address: '456 Oak Ave',
    phone: '(555) 234-5678',
    image_url: 'https://images.opentable.com/default-american.jpg',
    available_times: ['11:00', '12:00', '17:00', '18:00', '19:00', '20:00'],
  },
];

/**
 * Get restaurants for a location
 */
function getRestaurants(location: string, cuisine?: string): Restaurant[] {
  const normalized = location.toLowerCase().trim();
  
  // Find matching city
  let restaurants = restaurantData[normalized];
  
  // Try partial match
  if (!restaurants) {
    for (const [city, data] of Object.entries(restaurantData)) {
      if (normalized.includes(city) || city.includes(normalized)) {
        restaurants = data;
        break;
      }
    }
  }
  
  // Fall back to default
  if (!restaurants) {
    restaurants = defaultRestaurants;
  }
  
  // Filter by cuisine if specified
  if (cuisine) {
    const cuisineLower = cuisine.toLowerCase();
    const filtered = restaurants.filter(r => 
      r.cuisine.toLowerCase().includes(cuisineLower)
    );
    if (filtered.length > 0) {
      return filtered;
    }
  }
  
  return restaurants;
}

/**
 * Generate a confirmation number
 */
function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let num = 'OT-';
  for (let i = 0; i < 6; i++) {
    num += chars[Math.floor(Math.random() * chars.length)];
  }
  return num;
}

/**
 * Format time from 24h to 12h
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * OpenTable Restaurant Reservation Plugin
 */
export const opentablePlugin: BotPlugin = {
  id: 'opentable',
  name: 'OpenTable Reservation Bot',
  description: 'A restaurant assistant that helps users find restaurants and make reservations powered by OpenTable.',
  version: '1.0.0',
  
  systemPrompt: SYSTEM_PROMPT,
  tools: TOOLS,
  
  async initialize(config: PluginConfig): Promise<void> {
    // In a real implementation, we'd initialize the OpenTable API client here
    // For now, we use sandbox data
    console.log('[OpenTable Plugin] ✅ Initialized (sandbox mode)');
    console.log('[OpenTable Plugin] Available cities:', Object.keys(restaurantData).join(', '));
  },
  
  async executeTool(context: ToolContext): Promise<ToolResult> {
    const { toolName, arguments: args } = context;
    
    try {
      switch (toolName) {
        case 'search_restaurants': {
          const location = args.location as string;
          const cuisine = args.cuisine as string | undefined;
          const date = args.date as string || new Date().toISOString().split('T')[0];
          const time = args.time as string || '19:00';
          const partySize = args.party_size as number || 2;
          
          const restaurants = getRestaurants(location, cuisine);
          
          // Filter by time availability
          const available = restaurants.filter(r => {
            // Check if any time slot is close to requested time
            return r.available_times.some(t => {
              const [reqH] = time.split(':').map(Number);
              const [availH] = t.split(':').map(Number);
              return Math.abs(reqH - availH) <= 2;
            });
          });
          
          return {
            success: true,
            data: {
              type: 'restaurants',
              location,
              cuisine,
              date,
              time,
              party_size: partySize,
              restaurants: available.slice(0, 4).map(r => ({
                id: r.id,
                name: r.name,
                cuisine: r.cuisine,
                neighborhood: r.neighborhood,
                rating: r.rating,
                reviews: r.reviews,
                price_range: r.price_range,
                available_times: r.available_times.slice(0, 4),
              })),
            },
          };
        }
        
        case 'check_availability': {
          const restaurantId = args.restaurant_id as string;
          const date = args.date as string;
          const partySize = args.party_size as number || 2;
          
          // Find the restaurant
          let restaurant: Restaurant | undefined;
          for (const restaurants of Object.values(restaurantData)) {
            restaurant = restaurants.find(r => r.id === restaurantId);
            if (restaurant) break;
          }
          
          if (!restaurant) {
            restaurant = defaultRestaurants.find(r => r.id === restaurantId);
          }
          
          if (!restaurant) {
            return { success: false, error: 'Restaurant not found' };
          }
          
          return {
            success: true,
            data: {
              type: 'availability',
              restaurant_id: restaurantId,
              restaurant_name: restaurant.name,
              date,
              party_size: partySize,
              available_times: restaurant.available_times,
            },
          };
        }
        
        case 'make_reservation': {
          const restaurantId = args.restaurant_id as string;
          const restaurantName = args.restaurant_name as string;
          const date = args.date as string;
          const time = args.time as string;
          const partySize = args.party_size as number;
          const specialRequests = args.special_requests as string | undefined;
          
          // Find the restaurant for full details
          let restaurant: Restaurant | undefined;
          for (const restaurants of Object.values(restaurantData)) {
            restaurant = restaurants.find(r => r.id === restaurantId);
            if (restaurant) break;
          }
          
          if (!restaurant) {
            restaurant = defaultRestaurants.find(r => r.id === restaurantId) || {
              id: restaurantId,
              name: restaurantName,
              cuisine: 'Restaurant',
              neighborhood: '',
              city: '',
              rating: 4.5,
              reviews: 100,
              price_range: '$$$',
              address: '',
              phone: '',
              image_url: '',
              available_times: [],
            };
          }
          
          const confirmation: Reservation = {
            confirmation_number: generateConfirmationNumber(),
            restaurant,
            date,
            time,
            party_size: partySize,
            special_requests: specialRequests,
          };
          
          return {
            success: true,
            data: {
              type: 'reservation',
              confirmation_number: confirmation.confirmation_number,
              restaurant: {
                id: restaurant.id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                neighborhood: restaurant.neighborhood,
                address: restaurant.address,
                phone: restaurant.phone,
                rating: restaurant.rating,
                price_range: restaurant.price_range,
              },
              date,
              date_formatted: formatDate(date),
              time,
              time_formatted: formatTime(time),
              party_size: partySize,
              special_requests: specialRequests,
            },
          };
        }
        
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      console.error(`[OpenTable Plugin] Tool ${toolName} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  
  extractStorableData(toolResults: ToolResult[], grokMessage?: string): StorableData | null {
    // Look for a reservation confirmation first
    for (const result of toolResults) {
      if (!result.success || !result.data) continue;
      
      const data = result.data as any;
      
      if (data.type === 'reservation') {
        return {
          title: data.restaurant.name,
          subtitle: `${data.date_formatted} at ${data.time_formatted}`,
          primaryItem: {
            name: `Table for ${data.party_size}`,
            price: data.restaurant.price_range,
            rating: data.restaurant.rating,
          },
          secondaryItem: {
            name: `Confirmation: ${data.confirmation_number}`,
            price: data.restaurant.neighborhood ? `${data.restaurant.neighborhood}` : data.restaurant.cuisine,
          },
          actionUrl: `https://www.opentable.com/r/${data.restaurant.id}`,
          metadata: {
            type: 'reservation',
            confirmation_number: data.confirmation_number,
            restaurant: data.restaurant,
            date: data.date,
            time: data.time,
            party_size: data.party_size,
            special_requests: data.special_requests,
          },
        };
      }
      
      // If searching, try to find the restaurant Grok mentioned in the response
      if (data.type === 'restaurants' && data.restaurants?.length > 0) {
        let selectedRestaurant = data.restaurants[0]; // Default to first
        
        // Try to match restaurant name from Grok's message
        if (grokMessage) {
          const messageLower = grokMessage.toLowerCase();
          for (const restaurant of data.restaurants) {
            if (messageLower.includes(restaurant.name.toLowerCase())) {
              selectedRestaurant = restaurant;
              break;
            }
          }
        }
        
        return {
          title: selectedRestaurant.name,
          subtitle: `${selectedRestaurant.cuisine} · ${selectedRestaurant.neighborhood || data.location}`,
          primaryItem: {
            name: selectedRestaurant.name,
            price: selectedRestaurant.price_range,
            rating: selectedRestaurant.rating,
          },
          secondaryItem: {
            name: selectedRestaurant.cuisine,
            price: selectedRestaurant.neighborhood,
          },
          actionUrl: `https://www.opentable.com/r/${selectedRestaurant.id}`,
          metadata: {
            type: 'search',
            restaurant: selectedRestaurant,
            searchParams: {
              location: data.location,
              cuisine: data.cuisine,
              date: data.date,
              time: data.time,
              party_size: data.party_size,
            },
          },
        };
      }
    }
    
    return null;
  },
};

export default opentablePlugin;
