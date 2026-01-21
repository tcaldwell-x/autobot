# AutoBot - AI Travel Recommendations on X

An X/Twitter bot that responds to mentions with personalized hotel recommendations, powered by Expedia Group APIs.

## Project Structure

```
autobot/
├── src/                          # Bot (Node.js - runs on Railway/Render/VPS)
│   ├── index.ts                  # Entry point
│   ├── bot.ts                    # Bot orchestration
│   ├── config.ts                 # Environment config
│   ├── types.ts                  # TypeScript types
│   └── services/
│       ├── x-client.ts           # X API client
│       ├── filtered-stream.ts    # Real-time stream handler
│       ├── conversation.ts       # Thread fetching
│       ├── recommendations.ts    # Generates recs + website URLs
│       ├── reply.ts              # Tweet replies
│       └── expedia/              # Expedia API integration
│
├── web/                          # Website (Next.js - deploys to Vercel)
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── r/[id]/page.tsx       # Recommendation display page
│   │   └── api/og/[id]/route.tsx # Dynamic OG image generation
│   └── lib/types.ts              # Shared types
│
└── vercel.json                   # Vercel deployment config
```

## How It Works

1. User tweets mentioning `@autobot_demo` about travel plans
2. Bot analyzes the conversation thread for destinations, dates, preferences
3. Bot generates recommendations and replies with a link to our website
4. Website displays recommendations with a beautiful OG preview image
5. User clicks through to book on Expedia

## Deployment

### Website (Vercel)

The `web/` directory contains a Next.js app that deploys to Vercel.

#### Vercel Project Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `web` |
| **Build Command** | `npm run build` (or leave default) |
| **Output Directory** | `.next` (or leave default) |
| **Install Command** | `npm install` (or leave default) |

#### Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

#### Deploy Steps

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repository
4. Set **Root Directory** to `web`
5. Add environment variables
6. Deploy

### Bot (Railway/Render/VPS)

The bot requires a long-running process (filtered stream), so it can't run on Vercel. Deploy to:
- [Railway](https://railway.app)
- [Render](https://render.com)
- Any VPS (DigitalOcean, etc.)

#### Bot Environment Variables

```bash
# X API Credentials
X_BEARER_TOKEN=your_bearer_token
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

# Bot Config
BOT_USERNAME=autobot_demo
WEBSITE_URL=https://your-app.vercel.app

# Expedia (optional - uses sandbox if not set)
EXPEDIA_API_KEY=
EXPEDIA_SHARED_SECRET=
```

#### Bot Deploy Commands

```bash
# Install & build
npm install
npm run build

# Run
npm start
```

## Local Development

### Website

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

### Bot

```bash
# Root directory
npm install
npm run build
npm start
```

## API Integrations

### X API
- Filtered Stream (real-time mentions)
- Tweet lookup (conversation threads)
- Tweet creation (replies)

### Expedia Group APIs (Sandbox mode by default)
- Rapid API (Hotels)
- Vrbo API (Vacation Rentals)
- Cars API
- Activities API

## License

MIT
