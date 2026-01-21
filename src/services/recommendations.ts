import { 
  HotelRecommendation, 
  VacationRentalRecommendation,
  CarRentalRecommendation,
  ActivityRecommendation, 
  RecommendationResponse 
} from '../types';
import { TravelContext } from './conversation';
import { getExpediaClient, isExpediaConfigured } from './expedia';
import { config } from '../config';

/**
 * Data sent to website API for storage
 */
interface StoreRequest {
  destination: string;
  hotel?: { name: string; price: string; rating?: number };
  activity?: { title: string; price: string };
  searchUrl: string;
}

/**
 * Recommendation Service
 * Generates travel recommendations using Expedia Group APIs
 * 
 * Supports:
 * - Hotels (Rapid API)
 * - Vacation Rentals (Vrbo)
 * - Car Rentals
 * - Activities
 */
export class RecommendationService {
  
  /**
   * Generate recommendations based on travel context
   */
  async generateRecommendations(context: TravelContext): Promise<RecommendationResponse> {
    console.log('[Recommendations] Generating for context:', {
      destinations: context.destinations,
      dates: context.dates,
      travelers: context.travelers,
      preferences: context.preferences,
    });
    
    const destination = context.destinations[0] || 'popular destination';
    const { checkin, checkout } = this.parseDates(context.dates);
    const travelers = context.travelers || 2;
    
    // Use Expedia client (sandbox or real)
    if (isExpediaConfigured()) {
      try {
        return await this.getExpediaRecommendations(
          destination,
          checkin,
          checkout,
          travelers,
          context
        );
      } catch (error) {
        console.error('[Recommendations] Error:', error);
      }
    }
    
    // This shouldn't happen if bot initializes Expedia properly
    console.warn('[Recommendations] Expedia not configured, returning empty results');
    return this.getEmptyResponse(destination, checkin, checkout);
  }
  
  /**
   * Get recommendations from Expedia APIs (or sandbox)
   */
  private async getExpediaRecommendations(
    destination: string,
    checkin: string,
    checkout: string,
    travelers: number,
    context: TravelContext
  ): Promise<RecommendationResponse> {
    const client = getExpediaClient()!;
    
    console.log(`[Recommendations] Fetching from Expedia: ${destination} (${checkin} - ${checkout})`);
    
    const results = await client.searchAll(destination, checkin, checkout, travelers);
    
    // Transform to our format
    const hotels: HotelRecommendation[] = results.hotels.map(h => ({
      id: h.id,
      name: h.name,
      price: `$${h.price_per_night}/night`,
      pricePerNight: h.price_per_night,
      totalPrice: h.total_price,
      description: h.amenities.slice(0, 3).join(' • ') || 'Great location',
      rating: h.guest_rating,
      reviewCount: h.review_count,
      amenities: h.amenities,
      bookingUrl: h.booking_url,
      imageUrl: h.image_url,
    }));
    
    const vacationRentals: VacationRentalRecommendation[] = results.vacation_rentals.map(vr => ({
      id: vr.id,
      name: vr.name,
      propertyType: vr.property_type,
      price: `$${vr.price_per_night}/night`,
      pricePerNight: vr.price_per_night,
      totalPrice: vr.total_price,
      bedrooms: vr.bedrooms,
      bathrooms: vr.bathrooms,
      sleeps: vr.sleeps,
      description: `${vr.bedrooms} BR • Sleeps ${vr.sleeps}`,
      rating: vr.rating,
      reviewCount: vr.review_count,
      amenities: vr.amenities,
      bookingUrl: vr.booking_url,
      imageUrl: vr.image_url,
    }));
    
    const carRentals: CarRentalRecommendation[] = results.car_rentals.map(car => ({
      id: car.id,
      company: car.supplier,
      carType: car.vehicle_category,
      carName: car.vehicle_description,
      price: `$${car.price_per_day}/day`,
      pricePerDay: car.price_per_day,
      totalPrice: car.total_price,
      features: car.features,
      pickupLocation: car.pickup_location,
      bookingUrl: car.booking_url,
      imageUrl: car.image_url,
    }));
    
    const activities: ActivityRecommendation[] = results.activities.map(a => ({
      id: a.id,
      title: a.title,
      price: a.price_formatted,
      priceAmount: a.price,
      description: a.description,
      duration: a.duration,
      rating: a.rating,
      reviewCount: a.review_count,
      bookingUrl: a.booking_url,
      imageUrl: a.image_url,
    }));
    
    const searchUrl = client.generateSearchLink(destination, checkin, checkout);
    const summary = this.generateSummary(destination, hotels, vacationRentals, carRentals, activities, context);
    
    return {
      destination: this.capitalize(destination),
      checkin,
      checkout,
      hotels,
      vacationRentals,
      carRentals,
      activities,
      searchUrl,
      summary,
    };
  }
  
  /**
   * Parse dates from context
   */
  private parseDates(dates: string[]): { checkin: string; checkout: string } {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekAfter = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    return {
      checkin: nextWeek.toISOString().split('T')[0],
      checkout: weekAfter.toISOString().split('T')[0],
    };
  }
  
  /**
   * Generate a natural language summary
   */
  private generateSummary(
    destination: string,
    hotels: HotelRecommendation[],
    vacationRentals: VacationRentalRecommendation[],
    carRentals: CarRentalRecommendation[],
    activities: ActivityRecommendation[],
    context: TravelContext
  ): string {
    const parts: string[] = [`Here are my ${this.capitalize(destination)} picks!`];
    
    if (hotels.length > 0) {
      parts.push(`🏨 ${hotels[0].name} from ${hotels[0].price}`);
    }
    if (vacationRentals.length > 0) {
      parts.push(`🏠 ${vacationRentals[0].name} from ${vacationRentals[0].price}`);
    }
    if (activities.length > 0) {
      parts.push(`🎯 ${activities[0].title} ${activities[0].price}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Format recommendations for a tweet reply (280 char limit)
   * Links to our website which has OG preview images
   */
  async formatForTweet(recommendations: RecommendationResponse): Promise<string> {
    const hotel = recommendations.hotels[0];
    const websiteUrl = await this.generateWebsiteUrl(recommendations);
    
    if (!hotel) {
      return `Check out hotels in ${recommendations.destination}!\n\n${websiteUrl}`;
    }
    
    // Simple format: destination, hotel name, price, website link
    let reply = `🏨 ${recommendations.destination}: ${hotel.name}`;
    reply += `\n${hotel.price}`;
    if (hotel.rating) reply += ` ⭐${hotel.rating}`;
    reply += `\n\n${websiteUrl}`;
    
    // If still too long, shorten hotel name
    if (reply.length > 280) {
      reply = `🏨 ${recommendations.destination}: ${this.truncate(hotel.name, 25)}`;
      reply += `\n${hotel.price}`;
      reply += `\n\n${websiteUrl}`;
    }
    
    return reply.slice(0, 280);
  }
  
  /**
   * Generate short website URL via API storage
   */
  private async generateWebsiteUrl(recommendations: RecommendationResponse): Promise<string> {
    const hotel = recommendations.hotels[0];
    const activity = recommendations.activities[0];
    
    const data: StoreRequest = {
      destination: recommendations.destination,
      searchUrl: recommendations.searchUrl,
    };
    
    if (hotel) {
      data.hotel = { name: hotel.name, price: hotel.price, rating: hotel.rating };
    }
    if (activity) {
      data.activity = { title: activity.title, price: activity.price };
    }
    
    try {
      const apiUrl = `${config.websiteUrl}/api/recommendations`;
      console.log(`[Recommendations] Calling API: ${apiUrl}`);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        console.log(`[Recommendations] Short URL: ${url}`);
        return url;
      } else {
        const errText = await res.text();
        console.error(`[Recommendations] API failed (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.error('[Recommendations] API error:', err);
    }
    
    // Fallback to Expedia direct
    return recommendations.searchUrl;
  }
  
  /**
   * Format a more detailed response (for threads or longer formats)
   */
  formatDetailedResponse(recommendations: RecommendationResponse): string[] {
    const tweets: string[] = [];
    
    // Tweet 1: Hotels
    if (recommendations.hotels.length > 0) {
      let hotelTweet = `🏨 ${recommendations.destination} Hotels:\n\n`;
      for (const hotel of recommendations.hotels.slice(0, 2)) {
        hotelTweet += `• ${hotel.name}\n  ${hotel.price}`;
        if (hotel.rating) hotelTweet += ` ⭐${hotel.rating}`;
        hotelTweet += '\n';
      }
      hotelTweet += `\n🔗 ${this.shortenUrl(recommendations.searchUrl)}`;
      tweets.push(hotelTweet.slice(0, 280));
    }
    
    // Tweet 2: Vacation Rentals
    if (recommendations.vacationRentals.length > 0) {
      let rentalTweet = `🏠 ${recommendations.destination} Vacation Rentals:\n\n`;
      for (const rental of recommendations.vacationRentals.slice(0, 2)) {
        rentalTweet += `• ${rental.name}\n`;
        rentalTweet += `  ${rental.description} - ${rental.price}\n`;
      }
      rentalTweet += `\n🔗 vrbo.com`;
      tweets.push(rentalTweet.slice(0, 280));
    }
    
    // Tweet 3: Activities
    if (recommendations.activities.length > 0) {
      let actTweet = `🎯 Things to do in ${recommendations.destination}:\n\n`;
      for (const activity of recommendations.activities.slice(0, 2)) {
        actTweet += `• ${activity.title}\n  ${activity.price}`;
        if (activity.duration) actTweet += ` • ${activity.duration}`;
        actTweet += '\n';
      }
      tweets.push(actTweet.slice(0, 280));
    }
    
    return tweets;
  }
  
  /**
   * Get empty response
   */
  private getEmptyResponse(destination: string, checkin: string, checkout: string): RecommendationResponse {
    return {
      destination,
      checkin,
      checkout,
      hotels: [],
      vacationRentals: [],
      carRentals: [],
      activities: [],
      searchUrl: `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination)}`,
      summary: `Check out ${destination} on Expedia!`,
    };
  }
  
  /**
   * Shorten URL for tweet display
   */
  private shortenUrl(url: string): string {
    return url.replace(/^https?:\/\//, '').slice(0, 45);
  }
  
  /**
   * Truncate string
   */
  private truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len - 1) + '…' : str;
  }
  
  /**
   * Capitalize first letter of each word
   */
  private capitalize(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const recommendationService = new RecommendationService();
