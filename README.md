# XBot Framework

A framework for building AI-powered X/Twitter bots using Grok with function calling.

Build conversational bots that understand natural language, process images, and take actions through custom plugins.

## Features

- **Grok AI Integration** - Uses xAI's Grok model for intelligent conversations
- **Function Calling** - Grok can call your custom tools/APIs based on context
- **Image Understanding** - Process images, photos, and GIFs shared in tweets
- **Plugin Architecture** - Easily create custom bots for any use case
- **Real-time Streaming** - Monitor X mentions via filtered stream
- **Conversation Context** - Full thread context for multi-turn conversations
- **Rich Link Previews** - Auto-generated OG images for shareable links

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/xbot-framework.git
cd xbot-framework

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials (see Configuration section)

# Build and run
npm run build
npm start
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `X_BEARER_TOKEN` | X API Bearer Token (for reading) |
| `X_API_KEY` | X API Key |
| `X_API_SECRET` | X API Secret |
| `X_ACCESS_TOKEN` | X Access Token (for posting) |
| `X_ACCESS_TOKEN_SECRET` | X Access Token Secret |
| `GROK_API_KEY` | xAI Grok API Key |
| `BOT_USERNAME` | Your bot's X username (without @) |
| `WEBSITE_URL` | Base URL for link previews |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_PLUGIN` | `opentable` | Which plugin to use |
| `PLUGIN_SANDBOX_MODE` | `true` | Use sandbox/mock data |

### Getting API Keys

1. **X/Twitter API**: Apply at [developer.twitter.com](https://developer.twitter.com)
   - Create a project with "Read and Write" permissions
   - Generate Bearer Token, API Key/Secret, Access Token/Secret

2. **Grok API**: Get access at [x.ai](https://x.ai)
   - Create an API key in the dashboard

---

## Deployment

The bot requires a **long-running process** (not serverless). Here are your options:

### Option 1: Docker (Recommended)

Works on any platform that supports Docker.

```bash
# Build the image
docker build -t xbot .

# Run with environment variables
docker run -d \
  -e X_API_KEY=your_key \
  -e X_API_SECRET=your_secret \
  -e X_BEARER_TOKEN=your_token \
  -e X_ACCESS_TOKEN=your_access_token \
  -e X_ACCESS_TOKEN_SECRET=your_access_secret \
  -e GROK_API_KEY=your_grok_key \
  -e BOT_USERNAME=YourBot \
  -e WEBSITE_URL=https://your-site.vercel.app \
  xbot
```

Or use docker-compose:

```bash
# Create .env file with your credentials, then:
docker-compose up -d
```

### Option 2: Railway

1. Push your repo to GitHub
2. Connect to [Railway](https://railway.app)
3. Create new project → Deploy from GitHub repo
4. Add environment variables in Railway dashboard
5. Railway auto-detects the Dockerfile and deploys

### Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch (creates fly.toml)
fly launch

# Set secrets
fly secrets set X_API_KEY=xxx X_API_SECRET=xxx GROK_API_KEY=xxx ...

# Deploy
fly deploy
```

### Option 4: Render

1. Push to GitHub
2. Create new **Background Worker** on [Render](https://render.com)
3. Connect your repo
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables

### Option 5: Any VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into your server
ssh user@your-server

# Clone and setup
git clone https://github.com/your-username/xbot-framework.git
cd xbot-framework

# Option A: Run with Docker
docker-compose up -d

# Option B: Run with Node directly
npm install
npm run build
npm start

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name xbot
pm2 save
pm2 startup
```

### Website Deployment (Vercel)

The `web/` directory contains a Next.js app for link previews:

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Set root directory to `web`
4. Add environment variables:
   - `KV_REST_API_URL` - Upstash Redis URL
   - `KV_REST_API_TOKEN` - Upstash Redis token
   - `NEXT_PUBLIC_BASE_URL` - Your Vercel URL
5. Deploy

---

## Creating a Custom Plugin

### 1. Create Your Plugin

Create `src/plugins/my-plugin/index.ts`:

```typescript
import { BotPlugin, ToolContext, ToolResult, Tool, StorableData } from '../../framework/types';

const SYSTEM_PROMPT = `You are a helpful assistant on X/Twitter.

Your capabilities:
- Search for products using the search_products tool
- Provide recommendations based on user preferences

Rules:
- Keep responses under 200 characters when using tools (link appended automatically)
- Keep conversational responses under 280 characters
- Be friendly and helpful`;

const TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products by query and category',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          category: {
            type: 'string',
            description: 'Product category',
            enum: ['electronics', 'clothing', 'home'],
          },
        },
        required: ['query'],
      },
    },
  },
];

export const myPlugin: BotPlugin = {
  id: 'my-plugin',
  name: 'My Custom Bot',
  description: 'A bot that searches products',
  version: '1.0.0',
  
  systemPrompt: SYSTEM_PROMPT,
  tools: TOOLS,

  async initialize(config) {
    console.log('Plugin initialized!');
    // Setup API clients, database connections, etc.
  },

  async executeTool(context: ToolContext): Promise<ToolResult> {
    const { toolName, arguments: args } = context;

    switch (toolName) {
      case 'search_products': {
        // Call your API here
        const results = await fetchProducts(args.query, args.category);
        return {
          success: true,
          data: {
            type: 'products',
            items: results,
          },
        };
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  },

  extractStorableData(toolResults: ToolResult[]): StorableData | null {
    for (const result of toolResults) {
      if (!result.success || !result.data) continue;
      
      const data = result.data as any;
      if (data.type === 'products' && data.items?.length > 0) {
        const product = data.items[0];
        return {
          title: product.name,
          subtitle: product.category,
          primaryItem: {
            name: product.name,
            price: product.price,
            rating: product.rating,
          },
          actionUrl: product.url,
          metadata: { type: 'product', product },
        };
      }
    }
    return null;
  },

  async shutdown() {
    // Cleanup connections
  },
};

export default myPlugin;
```

### 2. Register Your Plugin

Add to `src/plugins/index.ts`:

```typescript
import { myPlugin } from './my-plugin';
import { opentablePlugin } from './opentable';

export const availablePlugins: BotPlugin[] = [
  opentablePlugin,
  myPlugin,
];
```

### 3. Configure

Set `BOT_PLUGIN=my-plugin` in your `.env` file.

---

## Plugin Interface Reference

```typescript
interface BotPlugin {
  // Identification
  id: string;
  name: string;
  description: string;
  version: string;

  // Grok Configuration
  systemPrompt: string;  // Bot personality and rules
  tools: Tool[];         // Available function calls

  // Lifecycle Methods
  initialize(config: PluginConfig): Promise<void>;
  executeTool(context: ToolContext): Promise<ToolResult>;

  // Optional Methods
  formatResponse?(message: string, results: ToolResult[]): Promise<BotResponse>;
  extractStorableData?(results: ToolResult[], grokMessage?: string): StorableData | null;
  shutdown?(): Promise<void>;
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface StorableData {
  title: string;
  subtitle?: string;
  primaryItem?: { name: string; price?: string; rating?: number };
  secondaryItem?: { name: string; price?: string };
  actionUrl: string;
  metadata?: Record<string, unknown>;
}
```

---

## Project Structure

```
├── src/
│   ├── index.ts              # Entry point
│   ├── bot.ts                # Bot orchestration
│   ├── config.ts             # Configuration
│   ├── types.ts              # Core types
│   │
│   ├── framework/            # XBot Framework core
│   │   ├── grok-client.ts    # Grok AI integration
│   │   ├── plugin-manager.ts # Plugin lifecycle
│   │   └── types.ts          # Framework types
│   │
│   ├── plugins/              # Bot plugins
│   │   ├── index.ts          # Plugin registry
│   │   └── opentable/        # Restaurant reservation bot
│   │
│   └── services/             # Core services
│       ├── x-client.ts       # X API client
│       ├── filtered-stream.ts# Real-time stream
│       ├── conversation.ts   # Thread handling
│       └── reply.ts          # Tweet posting
│
├── web/                      # Next.js website
│   ├── app/
│   │   ├── r/[id]/          # Link preview pages
│   │   └── api/og/[id]/     # OG image generation
│   └── lib/
│       ├── redis.ts         # Data storage
│       └── config.ts        # Branding config
│
├── Dockerfile               # Container build
├── docker-compose.yml       # Easy deployment
└── package.json
```

---

## Plugin Ideas

- **E-commerce Bot** - Search products, compare prices, track deals
- **Customer Support** - Answer FAQs, create tickets, check orders
- **Restaurant Bot** - Find restaurants, make reservations (included!)
- **Event Bot** - Find events, buy tickets, get directions
- **Real Estate Bot** - Search listings, schedule viewings
- **Fitness Bot** - Find classes, book sessions, track workouts
- **News Bot** - Search articles, get summaries, trending topics
- **Weather Bot** - Forecasts, alerts, travel conditions
- **Crypto Bot** - Price checks, portfolio tracking, alerts

---

## Troubleshooting

### Bot not responding to mentions

1. Check X API credentials have "Read and Write" permissions
2. Verify `BOT_USERNAME` matches your bot's actual username
3. Check the filtered stream is connected (look for "Connected successfully" in logs)

### "Unauthorized" errors

- Regenerate your X API tokens
- Ensure Bearer Token is from the same project as other credentials

### Images not being processed

- Grok vision is enabled automatically when images are detected
- Check that media expansions are working (look for "Found X image(s)" in logs)

### Link previews not showing

- Ensure `WEBSITE_URL` points to your deployed web app
- Check the web app's Redis connection (Upstash KV)
- Verify OG image route is working: `your-site.com/api/og/test`

---

## License

MIT
