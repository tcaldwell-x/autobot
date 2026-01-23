/**
 * Web App Branding Configuration
 * 
 * Customize the look and feel of your bot's web presence.
 * All settings can be overridden via environment variables.
 */

export interface BrandingConfig {
  // Bot identity
  name: string;
  tagline: string;
  logo: string;  // Emoji or URL to image
  
  // Colors (CSS values)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Gradients
  backgroundGradient: string;
  buttonGradient: string;
  textGradient: string;
  
  // Card styling
  cardBackground: string;
  cardBorder: string;
  
  // Attribution
  poweredBy: string;
  poweredByUrl: string;
  
  // Button text
  ctaText: string;
}

/**
 * Default branding configuration
 * Override any value with environment variables prefixed with NEXT_PUBLIC_BRAND_
 * 
 * Default colors based on OpenTable brand:
 * - Red: #DA3743 (primary)
 * - White: #ffffff (text)
 * - Dark: #1a1a1a (background)
 */
export const branding: BrandingConfig = {
  // Bot identity
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'ReservationBot',
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'AI-Powered Restaurant Reservations',
  logo: process.env.NEXT_PUBLIC_BRAND_LOGO || '🍽️',
  
  // Colors (OpenTable brand)
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#1a1a1a',     // Dark background
  secondaryColor: process.env.NEXT_PUBLIC_BRAND_SECONDARY_COLOR || '#DA3743', // OpenTable red
  accentColor: process.env.NEXT_PUBLIC_BRAND_ACCENT_COLOR || '#ffffff',       // White
  
  // Gradients
  backgroundGradient: process.env.NEXT_PUBLIC_BRAND_BG_GRADIENT || 
    'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
  buttonGradient: process.env.NEXT_PUBLIC_BRAND_BUTTON_GRADIENT || 
    'linear-gradient(90deg, #DA3743, #ff5a5a)',
  textGradient: process.env.NEXT_PUBLIC_BRAND_TEXT_GRADIENT || 
    'linear-gradient(90deg, #DA3743, #ff6b6b)',
  
  // Card styling
  cardBackground: process.env.NEXT_PUBLIC_BRAND_CARD_BG || 'rgba(45, 45, 45, 0.9)',
  cardBorder: process.env.NEXT_PUBLIC_BRAND_CARD_BORDER || 'rgba(218, 55, 67, 0.3)',
  
  // Attribution
  poweredBy: process.env.NEXT_PUBLIC_BRAND_POWERED_BY || 'Powered by OpenTable',
  poweredByUrl: process.env.NEXT_PUBLIC_BRAND_POWERED_BY_URL || 'https://www.opentable.com',
  
  // CTA
  ctaText: process.env.NEXT_PUBLIC_BRAND_CTA_TEXT || 'View on OpenTable →',
};

/**
 * Get CSS variables for use in stylesheets
 */
export function getBrandingCssVars(): Record<string, string> {
  return {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
    '--brand-bg-gradient': branding.backgroundGradient,
    '--brand-button-gradient': branding.buttonGradient,
    '--brand-text-gradient': branding.textGradient,
    '--brand-card-bg': branding.cardBackground,
    '--brand-card-border': branding.cardBorder,
  };
}
