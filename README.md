# AutoBot - X Travel Recommendation Bot

A Twitter/X bot that monitors mentions and responds with hotel and airline recommendations based on conversation context.

## Features

- **Filtered Stream**: Uses X API v2 filtered stream to monitor mentions in real-time
- **Conversation Analysis**: Fetches and analyzes the full conversation thread for context
- **Travel Context Extraction**: Extracts destinations, dates, traveler count, and preferences from conversations
- **Smart Recommendations**: Generates hotel and flight recommendations (placeholder data - ready for real API integration)
- **Automatic Reconnection**: Handles disconnections with exponential backoff
- **Duplicate Prevention**: Tracks processed tweets to avoid duplicate replies

## Prerequisites

- Node.js 18+ 
- X Developer Account with API access
- X App with the following permissions:
  - Read and write permissions (for posting replies)
  - Access to filtered stream endpoint (requires Elevated or Academic access)

## Setup

### 1. Clone and Install

```bash
cd autobot
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your X API credentials:

```env
# OAuth 2.0 Bearer Token (for filtered stream)
X_BEARER_TOKEN=your_bearer_token_here

# OAuth 1.0a credentials (for posting tweets)
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# Bot Configuration
BOT_USERNAME=autobot_demo
```

### 3. Get X API Credentials

1. Go to the [X Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Create a new project and app (or use existing)
3. Enable OAuth 1.0a with read and write permissions
4. Generate your API keys and access tokens
5. Copy the Bearer Token from the "Keys and Tokens" section

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Run the bot
npm start

# Or run in development mode (with ts-node)
npm run dev
```

## Usage

Once running, the bot will:

1. Connect to the X filtered stream
2. Monitor for any tweets mentioning `@autobot_demo` (or your configured username)
3. When mentioned:
   - Fetch the full conversation thread using `conversation_id`
   - Extract travel context (destinations, dates, preferences)
   - Generate recommendations
   - Reply to the tweet with recommendations

### Example Interaction

**User's tweet thread:**
```
User1: Planning a trip to Miami next month!
User2: @User1 Nice! Are you looking for budget or luxury options?
User1: @User2 Something mid-range, maybe with a pool
User3: @autobot_demo can you help with recommendations?
```

**Bot's reply:**
```
@User3 ✈️ Travel recs:

🏨 Hilton Miami
$189/night - ⭐4.5

🛫 American Airlines to Miami
$320

Want more options? Just ask!
```

## Managing Stream Rules

You can manage stream rules separately using the setup script:

```bash
# List current rules
npm run setup-rules list

# Add the default mention rule
npm run setup-rules add

# Clear all rules
npm run setup-rules clear

# Reset (clear and re-add)
npm run setup-rules reset
```

## Project Structure

```
autobot/
├── src/
│   ├── index.ts              # Main entry point
│   ├── bot.ts                # Bot orchestration logic
│   ├── config.ts             # Configuration management
│   ├── types.ts              # TypeScript type definitions
│   ├── services/
│   │   ├── x-client.ts       # X API client (OAuth 1.0a & 2.0)
│   │   ├── filtered-stream.ts # Filtered stream handler
│   │   ├── conversation.ts   # Conversation thread fetcher
│   │   ├── recommendations.ts # Recommendation generator
│   │   └── reply.ts          # Reply posting service
│   └── scripts/
│       └── setup-rules.ts    # Stream rules management
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Future Enhancements

- [ ] Integrate Grok API for intelligent recommendation generation
- [ ] Connect to real hotel APIs (Booking.com, Hotels.com, Amadeus)
- [ ] Connect to real flight APIs (Skyscanner, Google Flights, Amadeus)
- [ ] Add sentiment analysis for better context understanding
- [ ] Implement rate limiting and queue management
- [ ] Add database for tracking conversations and preferences
- [ ] Support for direct messages
- [ ] Multi-language support

## API Rate Limits

Be aware of X API rate limits:
- Filtered stream: 50 rules, 512 characters per rule
- Tweet creation: 200 requests per 15-minute window (user context)
- Tweet lookup: 900 requests per 15-minute window (app context)

## Troubleshooting

### "Filtered stream connection failed (403)"
- Ensure your X Developer account has Elevated or Academic access
- Check that your Bearer Token is valid

### "Failed to post reply (403)"
- Verify your OAuth 1.0a credentials have read and write permissions
- Regenerate your access tokens if needed

### Bot replies to the same tweet multiple times
- This shouldn't happen as the bot tracks processed tweets
- If it does, check for multiple bot instances running

## License

MIT
