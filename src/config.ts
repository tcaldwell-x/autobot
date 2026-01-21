import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // OAuth 2.0 Bearer Token (App-only auth for filtered stream)
  bearerToken: process.env.X_BEARER_TOKEN || '',
  
  // OAuth 1.0a credentials (User context auth for posting)
  apiKey: process.env.X_API_KEY || '',
  apiSecret: process.env.X_API_SECRET || '',
  accessToken: process.env.X_ACCESS_TOKEN || '',
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || '',
  
  // Bot configuration
  botUsername: process.env.BOT_USERNAME || 'autobot_demo',
  
  // Website URL (for OG preview links)
  websiteUrl: process.env.WEBSITE_URL || 'https://autobot.vercel.app',
  
  // Expedia Group API credentials (optional)
  expedia: {
    apiKey: process.env.EXPEDIA_API_KEY || '',
    sharedSecret: process.env.EXPEDIA_SHARED_SECRET || '',
    affiliateId: process.env.EXPEDIA_AFFILIATE_ID || '',
    // Use sandbox mode for testing without real credentials
    useSandbox: process.env.EXPEDIA_USE_SANDBOX === 'true' || !process.env.EXPEDIA_API_KEY,
  },
  
  // X API endpoints
  endpoints: {
    filteredStream: 'https://api.x.com/2/tweets/search/stream',
    filteredStreamRules: 'https://api.x.com/2/tweets/search/stream/rules',
    tweets: 'https://api.x.com/2/tweets',
    users: 'https://api.x.com/2/users',
  },
  
  // Reconnection settings
  reconnect: {
    maxRetries: 20, // Higher for provisioning delays
    baseDelayMs: 1000,
    maxDelayMs: 300000, // 5 minutes
  },
};

export function validateConfig(): void {
  const required = [
    'bearerToken',
    'apiKey',
    'apiSecret',
    'accessToken',
    'accessTokenSecret',
  ] as const;
  
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in your X API credentials.'
    );
  }
}
