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
   - search_restaurants: MUST call this when suggesting ANY restaurant
   - make_reservation: MUST call this when user confirms booking
   
2. ONLY SUGGEST RESTAURANTS FROM SEARCH RESULTS
   - After calling search_restaurants, you receive a list of restaurants
   - You MUST pick a restaurant from that list - use the EXACT name returned
   - NEVER make up restaurant names - only use names from the tool results
   - If the search returns "Trattoria Roma", say "Trattoria Roma" - not something else

3. NEVER say "Booked!" without calling make_reservation
   - The confirmation number comes from the tool result

RESPONSE LIMITS:
- Max 150 characters when using tools (link gets appended)
- Max 250 characters for general conversation

FLOW:
1. User wants restaurant → call search_restaurants → pick ONE from results, use EXACT name
2. User says "no" → call search_restaurants → pick DIFFERENT one from results
3. User confirms → call make_reservation → confirm with details from tool

NEVER:
- Make up restaurant names - only use names from search results
- Include URLs - system adds them automatically  
- List multiple options - pick ONE best match`;

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

// Sandbox data by city - extensive restaurant database
const restaurantData: Record<string, Restaurant[]> = {
  'new york': [
    // Italian
    { id: 'ot-carbone-nyc', name: 'Carbone', cuisine: 'Italian', neighborhood: 'Greenwich Village', city: 'New York', rating: 4.8, reviews: 2847, price_range: '$$$$', address: '181 Thompson St, New York, NY 10012', phone: '(212) 254-3000', image_url: '', available_times: ['17:30', '18:00', '19:30', '20:00', '21:00'] },
    { id: 'ot-lartusi-nyc', name: "L'Artusi", cuisine: 'Italian', neighborhood: 'West Village', city: 'New York', rating: 4.7, reviews: 3215, price_range: '$$$', address: '228 W 10th St, New York, NY 10014', phone: '(212) 255-5757', image_url: '', available_times: ['17:00', '18:00', '19:00', '19:30', '20:00', '21:00'] },
    { id: 'ot-don-angie-nyc', name: 'Don Angie', cuisine: 'Italian', neighborhood: 'West Village', city: 'New York', rating: 4.7, reviews: 1892, price_range: '$$$', address: '103 Greenwich Ave, New York, NY 10014', phone: '(212) 889-8884', image_url: '', available_times: ['17:30', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-rubirosa-nyc', name: 'Rubirosa', cuisine: 'Italian', neighborhood: 'Nolita', city: 'New York', rating: 4.6, reviews: 4521, price_range: '$$', address: '235 Mulberry St, New York, NY 10012', phone: '(212) 965-0500', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] },
    { id: 'ot-i-sodi-nyc', name: 'I Sodi', cuisine: 'Italian', neighborhood: 'West Village', city: 'New York', rating: 4.8, reviews: 2156, price_range: '$$$', address: '105 Christopher St, New York, NY 10014', phone: '(212) 414-5774', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-lilia-nyc', name: 'Lilia', cuisine: 'Italian', neighborhood: 'Williamsburg', city: 'New York', rating: 4.8, reviews: 3892, price_range: '$$$', address: '567 Union Ave, Brooklyn, NY 11211', phone: '(718) 576-3095', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-marea-nyc', name: 'Marea', cuisine: 'Italian Seafood', neighborhood: 'Central Park South', city: 'New York', rating: 4.7, reviews: 2987, price_range: '$$$$', address: '240 Central Park S, New York, NY 10019', phone: '(212) 582-5100', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    { id: 'ot-via-carota-nyc', name: 'Via Carota', cuisine: 'Italian', neighborhood: 'West Village', city: 'New York', rating: 4.6, reviews: 5123, price_range: '$$', address: '51 Grove St, New York, NY 10014', phone: '(212) 255-1962', image_url: '', available_times: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00'] },
    // Japanese
    { id: 'ot-sushi-nakazawa-nyc', name: 'Sushi Nakazawa', cuisine: 'Japanese', neighborhood: 'West Village', city: 'New York', rating: 4.9, reviews: 1893, price_range: '$$$$', address: '23 Commerce St, New York, NY 10014', phone: '(212) 924-2212', image_url: '', available_times: ['17:30', '18:00', '20:00', '20:30'] },
    { id: 'ot-masa-nyc', name: 'Masa', cuisine: 'Japanese', neighborhood: 'Columbus Circle', city: 'New York', rating: 4.9, reviews: 876, price_range: '$$$$', address: '10 Columbus Cir, New York, NY 10019', phone: '(212) 823-9800', image_url: '', available_times: ['18:00', '20:30'] },
    { id: 'ot-nobu-nyc', name: 'Nobu', cuisine: 'Japanese', neighborhood: 'Tribeca', city: 'New York', rating: 4.6, reviews: 6234, price_range: '$$$$', address: '105 Hudson St, New York, NY 10013', phone: '(212) 219-0500', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    { id: 'ot-ramen-lab-nyc', name: 'Ramen Lab', cuisine: 'Japanese', neighborhood: 'Nolita', city: 'New York', rating: 4.5, reviews: 2341, price_range: '$$', address: '70 Kenmare St, New York, NY 10012', phone: '(646) 613-7522', image_url: '', available_times: ['12:00', '13:00', '18:00', '19:00', '20:00'] },
    // French
    { id: 'ot-le-bernardin-nyc', name: 'Le Bernardin', cuisine: 'French Seafood', neighborhood: 'Midtown', city: 'New York', rating: 4.9, reviews: 3421, price_range: '$$$$', address: '155 W 51st St, New York, NY 10019', phone: '(212) 554-1515', image_url: '', available_times: ['17:00', '18:30', '19:00', '20:30', '21:30'] },
    { id: 'ot-daniel-nyc', name: 'Daniel', cuisine: 'French', neighborhood: 'Upper East Side', city: 'New York', rating: 4.8, reviews: 2134, price_range: '$$$$', address: '60 E 65th St, New York, NY 10065', phone: '(212) 288-0033', image_url: '', available_times: ['17:30', '19:00', '20:30'] },
    { id: 'ot-balthazar-nyc', name: 'Balthazar', cuisine: 'French', neighborhood: 'SoHo', city: 'New York', rating: 4.5, reviews: 8765, price_range: '$$$', address: '80 Spring St, New York, NY 10012', phone: '(212) 965-1414', image_url: '', available_times: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00', '22:00'] },
    // American
    { id: 'ot-gramercy-nyc', name: 'Gramercy Tavern', cuisine: 'American', neighborhood: 'Gramercy', city: 'New York', rating: 4.7, reviews: 4532, price_range: '$$$', address: '42 E 20th St, New York, NY 10003', phone: '(212) 477-0777', image_url: '', available_times: ['17:00', '17:30', '18:00', '19:00', '19:30', '20:00', '21:00'] },
    { id: 'ot-eleven-madison-nyc', name: 'Eleven Madison Park', cuisine: 'American', neighborhood: 'Flatiron', city: 'New York', rating: 4.9, reviews: 1567, price_range: '$$$$', address: '11 Madison Ave, New York, NY 10010', phone: '(212) 889-0905', image_url: '', available_times: ['17:30', '20:00'] },
    { id: 'ot-the-grill-nyc', name: 'The Grill', cuisine: 'American', neighborhood: 'Midtown', city: 'New York', rating: 4.6, reviews: 2345, price_range: '$$$$', address: '99 E 52nd St, New York, NY 10022', phone: '(212) 375-9001', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    // Steakhouse
    { id: 'ot-peter-luger-nyc', name: 'Peter Luger', cuisine: 'Steakhouse', neighborhood: 'Williamsburg', city: 'New York', rating: 4.5, reviews: 7832, price_range: '$$$$', address: '178 Broadway, Brooklyn, NY 11211', phone: '(718) 387-7400', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-keens-nyc', name: 'Keens Steakhouse', cuisine: 'Steakhouse', neighborhood: 'Garment District', city: 'New York', rating: 4.7, reviews: 5432, price_range: '$$$$', address: '72 W 36th St, New York, NY 10018', phone: '(212) 947-3636', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-cote-nyc', name: 'Cote Korean Steakhouse', cuisine: 'Korean Steakhouse', neighborhood: 'Flatiron', city: 'New York', rating: 4.7, reviews: 3214, price_range: '$$$$', address: '16 W 22nd St, New York, NY 10010', phone: '(212) 401-7986', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    // Mexican
    { id: 'ot-cosme-nyc', name: 'Cosme', cuisine: 'Mexican', neighborhood: 'Flatiron', city: 'New York', rating: 4.6, reviews: 3892, price_range: '$$$', address: '35 E 21st St, New York, NY 10010', phone: '(212) 913-9659', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    { id: 'ot-los-tacos-nyc', name: 'Los Tacos No. 1', cuisine: 'Mexican', neighborhood: 'Chelsea', city: 'New York', rating: 4.6, reviews: 5621, price_range: '$', address: '75 9th Ave, New York, NY 10011', phone: '(212) 256-0343', image_url: '', available_times: ['11:00', '12:00', '13:00', '18:00', '19:00', '20:00'] },
    // Indian
    { id: 'ot-indian-accent-nyc', name: 'Indian Accent', cuisine: 'Indian', neighborhood: 'Midtown', city: 'New York', rating: 4.7, reviews: 1876, price_range: '$$$$', address: '123 W 56th St, New York, NY 10019', phone: '(212) 842-8070', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-junoon-nyc', name: 'Junoon', cuisine: 'Indian', neighborhood: 'Flatiron', city: 'New York', rating: 4.5, reviews: 2345, price_range: '$$$', address: '19 W 24th St, New York, NY 10010', phone: '(212) 490-2100', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    // Chinese
    { id: 'ot-hwa-yuan-nyc', name: 'Hwa Yuan', cuisine: 'Chinese', neighborhood: 'Chinatown', city: 'New York', rating: 4.5, reviews: 3421, price_range: '$$', address: '42 E Broadway, New York, NY 10002', phone: '(212) 966-6002', image_url: '', available_times: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-joes-shanghai-nyc', name: "Joe's Shanghai", cuisine: 'Chinese', neighborhood: 'Chinatown', city: 'New York', rating: 4.4, reviews: 6543, price_range: '$$', address: '9 Pell St, New York, NY 10013', phone: '(212) 233-8888', image_url: '', available_times: ['11:30', '12:30', '18:00', '19:00', '20:00'] },
    // Thai
    { id: 'ot-fish-cheeks-nyc', name: 'Fish Cheeks', cuisine: 'Thai', neighborhood: 'NoHo', city: 'New York', rating: 4.6, reviews: 2187, price_range: '$$', address: '55 Bond St, New York, NY 10012', phone: '(212) 677-2223', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    // Greek
    { id: 'ot-avra-nyc', name: 'Avra', cuisine: 'Greek', neighborhood: 'Midtown East', city: 'New York', rating: 4.6, reviews: 3456, price_range: '$$$', address: '141 E 48th St, New York, NY 10017', phone: '(212) 759-8550', image_url: '', available_times: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00'] },
    // Spanish
    { id: 'ot-boqueria-nyc', name: 'Boqueria', cuisine: 'Spanish', neighborhood: 'Flatiron', city: 'New York', rating: 4.5, reviews: 4321, price_range: '$$', address: '53 W 19th St, New York, NY 10011', phone: '(212) 255-4160', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] },
  ],
  'san francisco': [
    // Italian
    { id: 'ot-flour-water-sf', name: 'Flour + Water', cuisine: 'Italian', neighborhood: 'Mission District', city: 'San Francisco', rating: 4.7, reviews: 4521, price_range: '$$$', address: '2401 Harrison St, San Francisco, CA 94110', phone: '(415) 826-7000', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    { id: 'ot-acquerello-sf', name: 'Acquerello', cuisine: 'Italian', neighborhood: 'Polk Gulch', city: 'San Francisco', rating: 4.8, reviews: 1876, price_range: '$$$$', address: '1722 Sacramento St, San Francisco, CA 94109', phone: '(415) 567-5432', image_url: '', available_times: ['17:30', '19:00', '20:30'] },
    { id: 'ot-cotogna-sf', name: 'Cotogna', cuisine: 'Italian', neighborhood: 'Jackson Square', city: 'San Francisco', rating: 4.6, reviews: 3214, price_range: '$$$', address: '490 Pacific Ave, San Francisco, CA 94133', phone: '(415) 775-8508', image_url: '', available_times: ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-delfina-sf', name: 'Delfina', cuisine: 'Italian', neighborhood: 'Mission District', city: 'San Francisco', rating: 4.6, reviews: 2987, price_range: '$$$', address: '3621 18th St, San Francisco, CA 94110', phone: '(415) 552-4055', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    // French
    { id: 'ot-atelier-sf', name: 'Atelier Crenn', cuisine: 'French', neighborhood: 'Cow Hollow', city: 'San Francisco', rating: 4.9, reviews: 1243, price_range: '$$$$', address: '3127 Fillmore St, San Francisco, CA 94123', phone: '(415) 440-0460', image_url: '', available_times: ['17:30', '18:00', '20:00', '20:30'] },
    { id: 'ot-petit-crenn-sf', name: 'Petit Crenn', cuisine: 'French', neighborhood: 'Hayes Valley', city: 'San Francisco', rating: 4.7, reviews: 987, price_range: '$$$', address: '609 Hayes St, San Francisco, CA 94102', phone: '(415) 864-1744', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00'] },
    // Japanese
    { id: 'ot-omakase-sf', name: 'Omakase', cuisine: 'Japanese', neighborhood: 'SOMA', city: 'San Francisco', rating: 4.8, reviews: 1543, price_range: '$$$$', address: '665 Townsend St, San Francisco, CA 94103', phone: '(415) 865-0633', image_url: '', available_times: ['18:00', '20:30'] },
    { id: 'ot-ju-ni-sf', name: 'Ju-Ni', cuisine: 'Japanese', neighborhood: 'Hayes Valley', city: 'San Francisco', rating: 4.9, reviews: 876, price_range: '$$$$', address: '1335 Fulton St, San Francisco, CA 94117', phone: '(415) 655-9924', image_url: '', available_times: ['18:00', '20:00'] },
    { id: 'ot-nojo-sf', name: 'Nojo Ramen Tavern', cuisine: 'Japanese', neighborhood: 'Hayes Valley', city: 'San Francisco', rating: 4.5, reviews: 2341, price_range: '$$', address: '231 Franklin St, San Francisco, CA 94102', phone: '(415) 896-4587', image_url: '', available_times: ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'] },
    // Greek
    { id: 'ot-kokkari-sf', name: 'Kokkari Estiatorio', cuisine: 'Greek', neighborhood: 'Financial District', city: 'San Francisco', rating: 4.7, reviews: 3892, price_range: '$$$', address: '200 Jackson St, San Francisco, CA 94111', phone: '(415) 981-0983', image_url: '', available_times: ['17:00', '18:00', '18:30', '19:00', '20:00', '21:00'] },
    // American
    { id: 'ot-lazy-sf', name: 'Lazy Bear', cuisine: 'American', neighborhood: 'Mission District', city: 'San Francisco', rating: 4.8, reviews: 2156, price_range: '$$$$', address: '3416 19th St, San Francisco, CA 94110', phone: '(415) 874-9921', image_url: '', available_times: ['18:00', '20:30'] },
    { id: 'ot-state-bird-sf', name: 'State Bird Provisions', cuisine: 'American', neighborhood: 'Fillmore', city: 'San Francisco', rating: 4.7, reviews: 3421, price_range: '$$$', address: '1529 Fillmore St, San Francisco, CA 94115', phone: '(415) 795-1272', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-rich-table-sf', name: 'Rich Table', cuisine: 'American', neighborhood: 'Hayes Valley', city: 'San Francisco', rating: 4.6, reviews: 2876, price_range: '$$$', address: '199 Gough St, San Francisco, CA 94102', phone: '(415) 355-9085', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    // Mexican
    { id: 'ot-tacolicious-sf', name: 'Tacolicious', cuisine: 'Mexican', neighborhood: 'Marina', city: 'San Francisco', rating: 4.4, reviews: 4521, price_range: '$$', address: '2031 Chestnut St, San Francisco, CA 94123', phone: '(415) 346-1966', image_url: '', available_times: ['11:30', '12:00', '17:00', '18:00', '19:00', '20:00'] },
    { id: 'ot-nopalito-sf', name: 'Nopalito', cuisine: 'Mexican', neighborhood: 'Inner Sunset', city: 'San Francisco', rating: 4.6, reviews: 3214, price_range: '$$', address: '1224 9th Ave, San Francisco, CA 94122', phone: '(415) 233-9966', image_url: '', available_times: ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'] },
    // Chinese
    { id: 'ot-mister-jius-sf', name: "Mister Jiu's", cuisine: 'Chinese', neighborhood: 'Chinatown', city: 'San Francisco', rating: 4.7, reviews: 1987, price_range: '$$$', address: '28 Waverly Pl, San Francisco, CA 94108', phone: '(415) 857-9688', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-china-live-sf', name: 'China Live', cuisine: 'Chinese', neighborhood: 'Chinatown', city: 'San Francisco', rating: 4.5, reviews: 2543, price_range: '$$', address: '644 Broadway, San Francisco, CA 94133', phone: '(415) 788-8188', image_url: '', available_times: ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'] },
    // Indian
    { id: 'ot-rooh-sf', name: 'ROOH', cuisine: 'Indian', neighborhood: 'SOMA', city: 'San Francisco', rating: 4.5, reviews: 1654, price_range: '$$$', address: '333 Brannan St, San Francisco, CA 94107', phone: '(415) 525-4174', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    // Thai
    { id: 'ot-kin-khao-sf', name: 'Kin Khao', cuisine: 'Thai', neighborhood: 'Union Square', city: 'San Francisco', rating: 4.6, reviews: 2143, price_range: '$$', address: '55 Cyril Magnin St, San Francisco, CA 94102', phone: '(415) 362-7456', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    // Steakhouse
    { id: 'ot-house-prime-sf', name: 'House of Prime Rib', cuisine: 'Steakhouse', neighborhood: 'Nob Hill', city: 'San Francisco', rating: 4.6, reviews: 6543, price_range: '$$$', address: '1906 Van Ness Ave, San Francisco, CA 94109', phone: '(415) 885-4605', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
  ],
  'los angeles': [
    // Italian
    { id: 'ot-bestia-la', name: 'Bestia', cuisine: 'Italian', neighborhood: 'Arts District', city: 'Los Angeles', rating: 4.7, reviews: 5432, price_range: '$$$', address: '2121 E 7th Pl, Los Angeles, CA 90021', phone: '(213) 514-5724', image_url: '', available_times: ['17:00', '17:30', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-republ-la', name: 'Republique', cuisine: 'Italian-French', neighborhood: 'Mid-Wilshire', city: 'Los Angeles', rating: 4.7, reviews: 4321, price_range: '$$$', address: '624 S La Brea Ave, Los Angeles, CA 90036', phone: '(310) 362-6115', image_url: '', available_times: ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-felix-la', name: 'Felix', cuisine: 'Italian', neighborhood: 'Venice', city: 'Los Angeles', rating: 4.6, reviews: 2987, price_range: '$$$', address: '1023 Abbot Kinney Blvd, Venice, CA 90291', phone: '(424) 387-8622', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    { id: 'ot-osteria-mozza-la', name: 'Osteria Mozza', cuisine: 'Italian', neighborhood: 'Hollywood', city: 'Los Angeles', rating: 4.7, reviews: 3654, price_range: '$$$', address: '6602 Melrose Ave, Los Angeles, CA 90038', phone: '(323) 297-0100', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-madeo-la', name: 'Madeo', cuisine: 'Italian', neighborhood: 'West Hollywood', city: 'Los Angeles', rating: 4.5, reviews: 2341, price_range: '$$$$', address: '8897 Beverly Blvd, West Hollywood, CA 90048', phone: '(310) 859-4903', image_url: '', available_times: ['18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-mother-wolf-la', name: 'Mother Wolf', cuisine: 'Italian', neighborhood: 'Hollywood', city: 'Los Angeles', rating: 4.6, reviews: 1876, price_range: '$$$', address: '1545 Wilcox Ave, Los Angeles, CA 90028', phone: '(323) 410-6060', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-rossoblu-la', name: 'Rossoblu', cuisine: 'Italian', neighborhood: 'Downtown', city: 'Los Angeles', rating: 4.5, reviews: 1654, price_range: '$$$', address: '1124 San Julian St, Los Angeles, CA 90015', phone: '(213) 749-1099', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    // Japanese
    { id: 'ot-nobu-la', name: 'Nobu Malibu', cuisine: 'Japanese', neighborhood: 'Malibu', city: 'Los Angeles', rating: 4.6, reviews: 6234, price_range: '$$$$', address: '22706 Pacific Coast Hwy, Malibu, CA 90265', phone: '(310) 317-9140', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-sushi-ginza-la', name: 'Sushi Ginza Onodera', cuisine: 'Japanese', neighborhood: 'West Hollywood', city: 'Los Angeles', rating: 4.9, reviews: 876, price_range: '$$$$', address: '609 N La Cienega Blvd, West Hollywood, CA 90069', phone: '(310) 657-8822', image_url: '', available_times: ['18:00', '20:30'] },
    { id: 'ot-n-naka-la', name: 'n/naka', cuisine: 'Japanese', neighborhood: 'Palms', city: 'Los Angeles', rating: 4.9, reviews: 543, price_range: '$$$$', address: '3455 Overland Ave, Los Angeles, CA 90034', phone: '(310) 836-6252', image_url: '', available_times: ['18:00', '20:00'] },
    { id: 'ot-matsuhisa-la', name: 'Matsuhisa', cuisine: 'Japanese', neighborhood: 'Beverly Hills', city: 'Los Angeles', rating: 4.7, reviews: 3214, price_range: '$$$$', address: '129 N La Cienega Blvd, Beverly Hills, CA 90211', phone: '(310) 659-9639', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30', '21:30'] },
    // Seafood
    { id: 'ot-providence-la', name: 'Providence', cuisine: 'Seafood', neighborhood: 'Hollywood', city: 'Los Angeles', rating: 4.8, reviews: 2876, price_range: '$$$$', address: '5955 Melrose Ave, Los Angeles, CA 90038', phone: '(323) 460-4170', image_url: '', available_times: ['17:30', '18:00', '20:00', '20:30'] },
    { id: 'ot-connie-teds-la', name: "Connie & Ted's", cuisine: 'Seafood', neighborhood: 'West Hollywood', city: 'Los Angeles', rating: 4.5, reviews: 2654, price_range: '$$$', address: '8171 Santa Monica Blvd, West Hollywood, CA 90046', phone: '(323) 848-2722', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    // Mexican
    { id: 'ot-guelaguetza-la', name: 'Guelaguetza', cuisine: 'Mexican', neighborhood: 'Koreatown', city: 'Los Angeles', rating: 4.5, reviews: 3892,
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
    { id: 'ot-versailles-mia', name: 'Versailles Restaurant', cuisine: 'Cuban', neighborhood: 'Little Havana', city: 'Miami', rating: 4.3, reviews: 7654, price_range: '$$', address: '3555 SW 8th St, Miami, FL 33135', phone: '(305) 444-0240', image_url: '', available_times: ['11:00', '12:00', '13:00', '17:00', '18:00', '19:00', '20:00'] },
    { id: 'ot-cvi-che-mia', name: 'CVI.CHE 105', cuisine: 'Peruvian', neighborhood: 'Downtown', city: 'Miami', rating: 4.6, reviews: 3421, price_range: '$$$', address: '105 NE 3rd Ave, Miami, FL 33132', phone: '(305) 577-3454', image_url: '', available_times: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-zuma-mia', name: 'Zuma', cuisine: 'Japanese', neighborhood: 'Downtown', city: 'Miami', rating: 4.7, reviews: 2876, price_range: '$$$$', address: '270 Biscayne Blvd Way, Miami, FL 33131', phone: '(305) 577-0277', image_url: '', available_times: ['18:00', '19:00', '20:00', '21:00', '22:00'] },
    { id: 'ot-macchialina-mia', name: 'Macchialina', cuisine: 'Italian', neighborhood: 'South Beach', city: 'Miami', rating: 4.6, reviews: 1987, price_range: '$$$', address: '820 Alton Rd, Miami Beach, FL 33139', phone: '(305) 534-2124', image_url: '', available_times: ['18:00', '19:00', '20:00', '21:00'] },
  ],
  'denver': [
    { id: 'ot-frasca-den', name: 'Frasca Food and Wine', cuisine: 'Italian', neighborhood: 'Boulder', city: 'Denver', rating: 4.8, reviews: 1876, price_range: '$$$$', address: '1738 Pearl St, Boulder, CO 80302', phone: '(303) 442-6966', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-tavernetta-den', name: 'Tavernetta', cuisine: 'Italian', neighborhood: 'Union Station', city: 'Denver', rating: 4.7, reviews: 2341, price_range: '$$$', address: '1889 16th St, Denver, CO 80202', phone: '(720) 605-1889', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-acorn-den', name: 'Acorn', cuisine: 'American', neighborhood: 'RiNo', city: 'Denver', rating: 4.6, reviews: 3214, price_range: '$$$', address: '3350 Brighton Blvd, Denver, CO 80216', phone: '(720) 542-3721', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-sushi-den-den', name: 'Sushi Den', cuisine: 'Japanese', neighborhood: 'South Pearl', city: 'Denver', rating: 4.7, reviews: 4521, price_range: '$$$', address: '1487 S Pearl St, Denver, CO 80210', phone: '(303) 777-0826', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-guard-grace-den', name: 'Guard and Grace', cuisine: 'Steakhouse', neighborhood: 'Downtown', city: 'Denver', rating: 4.6, reviews: 2987, price_range: '$$$$', address: '1801 California St, Denver, CO 80202', phone: '(303) 293-8500', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-mercantile-den', name: 'Mercantile Dining & Provision', cuisine: 'American', neighborhood: 'Union Station', city: 'Denver', rating: 4.5, reviews: 2143, price_range: '$$$', address: '1701 Wynkoop St, Denver, CO 80202', phone: '(720) 460-3733', image_url: '', available_times: ['11:00', '12:00', '17:00', '18:00', '19:00', '20:00'] },
    { id: 'ot-linger-den', name: 'Linger', cuisine: 'International', neighborhood: 'LoHi', city: 'Denver', rating: 4.5, reviews: 3654, price_range: '$$', address: '2030 W 30th Ave, Denver, CO 80211', phone: '(303) 993-3120', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] },
    { id: 'ot-los-chingones-den', name: 'Los Chingones', cuisine: 'Mexican', neighborhood: 'RiNo', city: 'Denver', rating: 4.4, reviews: 2876, price_range: '$$', address: '2463 Larimer St, Denver, CO 80205', phone: '(303) 295-0686', image_url: '', available_times: ['11:00', '12:00', '17:00', '18:00', '19:00', '20:00', '21:00'] },
  ],
  'seattle': [
    { id: 'ot-canlis-sea', name: 'Canlis', cuisine: 'American', neighborhood: 'Westlake', city: 'Seattle', rating: 4.9, reviews: 1543, price_range: '$$$$', address: '2576 Aurora Ave N, Seattle, WA 98109', phone: '(206) 283-3313', image_url: '', available_times: ['17:30', '19:30'] },
    { id: 'ot-altura-sea', name: 'Altura', cuisine: 'Italian', neighborhood: 'Capitol Hill', city: 'Seattle', rating: 4.8, reviews: 987, price_range: '$$$$', address: '617 Broadway E, Seattle, WA 98102', phone: '(206) 402-6749', image_url: '', available_times: ['17:00', '19:30'] },
    { id: 'ot-bateau-sea', name: 'Bateau', cuisine: 'Steakhouse', neighborhood: 'Capitol Hill', city: 'Seattle', rating: 4.7, reviews: 1234, price_range: '$$$$', address: '1040 E Union St, Seattle, WA 98122', phone: '(206) 900-8699', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00'] },
    { id: 'ot-shiro-sea', name: "Shiro's", cuisine: 'Japanese', neighborhood: 'Belltown', city: 'Seattle', rating: 4.8, reviews: 2341, price_range: '$$$$', address: '2401 2nd Ave, Seattle, WA 98121', phone: '(206) 443-9844', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-walrus-sea', name: 'The Walrus and the Carpenter', cuisine: 'Seafood', neighborhood: 'Ballard', city: 'Seattle', rating: 4.6, reviews: 3214, price_range: '$$$', address: '4743 Ballard Ave NW, Seattle, WA 98107', phone: '(206) 395-9227', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-spinasse-sea', name: 'Spinasse', cuisine: 'Italian', neighborhood: 'Capitol Hill', city: 'Seattle', rating: 4.7, reviews: 1876, price_range: '$$$', address: '1531 14th Ave, Seattle, WA 98122', phone: '(206) 251-7673', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
  ],
  'austin': [
    { id: 'ot-uchi-aus', name: 'Uchi', cuisine: 'Japanese', neighborhood: 'South Lamar', city: 'Austin', rating: 4.8, reviews: 3421, price_range: '$$$$', address: '801 S Lamar Blvd, Austin, TX 78704', phone: '(512) 916-4808', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-lenoir-aus', name: 'Lenoir', cuisine: 'American', neighborhood: 'South Congress', city: 'Austin', rating: 4.7, reviews: 1234, price_range: '$$$$', address: '1807 S 1st St, Austin, TX 78704', phone: '(512) 215-9778', image_url: '', available_times: ['18:00', '20:00'] },
    { id: 'ot-franklin-aus', name: 'Franklin Barbecue', cuisine: 'BBQ', neighborhood: 'East Austin', city: 'Austin', rating: 4.9, reviews: 8765, price_range: '$$', address: '900 E 11th St, Austin, TX 78702', phone: '(512) 653-1187', image_url: '', available_times: ['11:00', '12:00', '13:00'] },
    { id: 'ot-emmer-aus', name: 'Emmer & Rye', cuisine: 'American', neighborhood: 'Rainey Street', city: 'Austin', rating: 4.6, reviews: 1876, price_range: '$$$', address: '51 Rainey St, Austin, TX 78701', phone: '(512) 366-5530', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
    { id: 'ot-juniper-aus', name: 'Juniper', cuisine: 'Italian', neighborhood: 'East Austin', city: 'Austin', rating: 4.5, reviews: 1543, price_range: '$$$', address: '2400 E Cesar Chavez St, Austin, TX 78702', phone: '(512) 220-9421', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-suerte-aus', name: 'Suerte', cuisine: 'Mexican', neighborhood: 'East Austin', city: 'Austin', rating: 4.7, reviews: 2341, price_range: '$$$', address: '1800 E 6th St, Austin, TX 78702', phone: '(512) 953-0092', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
  ],
  'boston': [
    { id: 'ot-oleana-bos', name: 'Oleana', cuisine: 'Mediterranean', neighborhood: 'Cambridge', city: 'Boston', rating: 4.8, reviews: 2143, price_range: '$$$', address: '134 Hampshire St, Cambridge, MA 02139', phone: '(617) 661-0505', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-menton-bos', name: 'Menton', cuisine: 'French', neighborhood: 'Seaport', city: 'Boston', rating: 4.9, reviews: 1234, price_range: '$$$$', address: '354 Congress St, Boston, MA 02210', phone: '(617) 737-0099', image_url: '', available_times: ['17:30', '19:30'] },
    { id: 'ot-no9-bos', name: 'No. 9 Park', cuisine: 'French-Italian', neighborhood: 'Beacon Hill', city: 'Boston', rating: 4.7, reviews: 1876, price_range: '$$$$', address: '9 Park St, Boston, MA 02108', phone: '(617) 742-9991', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00'] },
    { id: 'ot-oishii-bos', name: 'Oishii', cuisine: 'Japanese', neighborhood: 'South End', city: 'Boston', rating: 4.7, reviews: 2341, price_range: '$$$$', address: '1166 Washington St, Boston, MA 02118', phone: '(617) 482-8868', image_url: '', available_times: ['17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-neptune-bos', name: 'Neptune Oyster', cuisine: 'Seafood', neighborhood: 'North End', city: 'Boston', rating: 4.6, reviews: 4321, price_range: '$$$', address: '63 Salem St, Boston, MA 02113', phone: '(617) 742-3474', image_url: '', available_times: ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'] },
    { id: 'ot-sorellina-bos', name: 'Sorellina', cuisine: 'Italian', neighborhood: 'Back Bay', city: 'Boston', rating: 4.6, reviews: 1987, price_range: '$$$$', address: '1 Huntington Ave, Boston, MA 02116', phone: '(617) 412-4600', image_url: '', available_times: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
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
          // Normalize for matching - remove punctuation and extra spaces
          const normalizeForMatch = (s: string) => s.toLowerCase().replace(/[''`]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          const messageNorm = normalizeForMatch(grokMessage);
          
          for (const restaurant of data.restaurants) {
            const nameNorm = normalizeForMatch(restaurant.name);
            // Check if the restaurant name appears in the message
            if (messageNorm.includes(nameNorm)) {
              selectedRestaurant = restaurant;
              console.log(`[OpenTable] Matched restaurant "${restaurant.name}" from Grok message`);
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
