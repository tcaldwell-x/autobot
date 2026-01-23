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
 * Color palette:
 * - Deep Red: #b91c1c (saturated, bold)
 * - Charcoal/Black: #0a0a0a (near black)
 * - White: #ffffff (text/accent)
 */
export const branding: BrandingConfig = {
  // Bot identity
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'ReservationBot',
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'AI-Powered Restaurant Reservations',
  logo: process.env.NEXT_PUBLIC_BRAND_LOGO || '🍽️',
  
  // Colors (dark + saturated red)
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#0a0a0a',     // Near black
  secondaryColor: process.env.NEXT_PUBLIC_BRAND_SECONDARY_COLOR || '#b91c1c', // Deep saturated red
  accentColor: process.env.NEXT_PUBLIC_BRAND_ACCENT_COLOR || '#ffffff',       // White
  
  // Gradients (darker, more dramatic)
  backgroundGradient: process.env.NEXT_PUBLIC_BRAND_BG_GRADIENT || 
    'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%)',
  buttonGradient: process.env.NEXT_PUBLIC_BRAND_BUTTON_GRADIENT || 
    'linear-gradient(90deg, #b91c1c, #dc2626)',
  textGradient: process.env.NEXT_PUBLIC_BRAND_TEXT_GRADIENT || 
    'linear-gradient(90deg, #dc2626, #ef4444)',
  
  // Card styling (darker)
  cardBackground: process.env.NEXT_PUBLIC_BRAND_CARD_BG || 'rgba(23, 23, 23, 0.95)',
  cardBorder: process.env.NEXT_PUBLIC_BRAND_CARD_BORDER || 'rgba(185, 28, 28, 0.4)',
  
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
