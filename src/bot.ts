import { config } from './config';
import { filteredStream } from './services/filtered-stream';
import { conversationService } from './services/conversation';
import { recommendationService } from './services/recommendations';
import { replyService } from './services/reply';
import { xClient } from './services/x-client';
import { initExpediaClient, isExpediaConfigured } from './services/expedia';
import { StreamData } from './types';

/**
 * AutoBot - Travel Recommendation Bot
 * Monitors X for mentions and responds with travel recommendations
 */
export class AutoBot {
  private isRunning = false;
  private botUserId: string | null = null;
  private repliedConversations = new Set<string>(); // Track conversations we've replied to
  
  /**
   * Initialize and start the bot
   */
  async start(): Promise<void> {
    console.log('='.repeat(50));
    console.log(`🤖 AutoBot Starting...`);
    console.log(`📍 Monitoring mentions of @${config.botUsername}`);
    console.log('='.repeat(50));
    
    // Initialize Expedia client if credentials are configured
    this.initializeExpedia();
    
    // Get the bot's user ID (needed to ignore self-replies)
    await this.fetchBotUserId();
    
    // Setup stream rules for mentions
    await this.setupStreamRules();
    
    // Register stream handlers
    this.registerHandlers();
    
    // Connect to filtered stream
    this.isRunning = true;
    await filteredStream.connect();
  }
  
  /**
   * Stop the bot
   */
  stop(): void {
    console.log('🛑 AutoBot stopping...');
    this.isRunning = false;
    filteredStream.disconnect();
  }
  
  /**
   * Initialize Expedia client
   * Uses sandbox mode if no real credentials are provided
   */
  private initializeExpedia(): void {
    const { apiKey, sharedSecret, affiliateId, useSandbox } = config.expedia;
    
    if (apiKey && sharedSecret && !useSandbox) {
      // Real API mode
      initExpediaClient(apiKey, sharedSecret, affiliateId, false);
      console.log('✅ Expedia API configured - using LIVE data');
    } else {
      // Sandbox mode - always initialize with sandbox data
      initExpediaClient('sandbox', 'sandbox', 'autobot-demo', true);
      console.log('🧪 Expedia SANDBOX mode - using simulated data');
      console.log('   Set EXPEDIA_API_KEY and EXPEDIA_SHARED_SECRET for live data');
    }
  }
  
  /**
   * Fetch the bot's user ID to filter out self-replies
   * Includes retry logic for temporary X API failures
   */
  private async fetchBotUserId(retryCount = 0): Promise<void> {
    const maxRetries = 5;
    
    try {
      console.log(`[Bot] Fetching user ID for @${config.botUsername}...`);
      const response = await xClient.getUserByUsername(config.botUsername);
      this.botUserId = response.data.id;
      console.log(`[Bot] Bot user ID: ${this.botUserId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMsg.includes('503') || errorMsg.includes('Service Unavailable') || 
                          errorMsg.includes('429') || errorMsg.includes('rate limit');
      
      if (isRetryable && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 2000;
        console.log(`[Bot] ⚠️  X API temporarily unavailable, retrying in ${delay/1000}s (attempt ${retryCount + 1}/${maxRetries})`);
        await this.sleep(delay);
        return this.fetchBotUserId(retryCount + 1);
      }
      
      console.error('[Bot] Failed to fetch bot user ID:', error);
      throw new Error('Could not fetch bot user ID - cannot start without it');
    }
  }
  
  /**
   * Setup filtered stream rules to capture mentions
   * Includes retry logic for temporary X API failures
   */
  private async setupStreamRules(retryCount = 0): Promise<void> {
    const maxRetries = 5;
    
    console.log('[Bot] Setting up stream rules...');
    
    try {
      // Get existing rules
      const existingRules = await xClient.getStreamRules();
      
      // Delete existing rules if any
      if (existingRules.data && existingRules.data.length > 0) {
        const ids = existingRules.data.map(rule => rule.id!).filter(Boolean);
        if (ids.length > 0) {
          console.log(`[Bot] Deleting ${ids.length} existing rules`);
          await xClient.deleteStreamRules(ids);
        }
      }
      
      // Add rule for mentions of our bot
      const newRules = [
        {
          value: `@${config.botUsername}`,
          tag: 'bot-mention',
        },
      ];
      
      console.log(`[Bot] Adding rule: @${config.botUsername}`);
      const result = await xClient.addStreamRules(newRules);
      
      if (result.errors && result.errors.length > 0) {
        console.error('[Bot] Rule errors:', result.errors);
      }
      
      if (result.meta?.summary) {
        console.log(`[Bot] Rules created: ${result.meta.summary.created}, valid: ${result.meta.summary.valid}`);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMsg.includes('503') || errorMsg.includes('Service Unavailable') || 
                          errorMsg.includes('429') || errorMsg.includes('rate limit');
      
      if (isRetryable && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s, 16s, 32s
        console.log(`[Bot] ⚠️  X API temporarily unavailable, retrying in ${delay/1000}s (attempt ${retryCount + 1}/${maxRetries})`);
        await this.sleep(delay);
        return this.setupStreamRules(retryCount + 1);
      }
      
      console.error('[Bot] Failed to setup stream rules:', error);
      throw error;
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Register handlers for the filtered stream
   */
  private registerHandlers(): void {
    // Handle incoming tweets
    filteredStream.onTweet(async (data: StreamData) => {
      await this.handleMention(data);
    });
    
    // Handle errors
    filteredStream.onError((error: Error) => {
      console.error('[Bot] Stream error:', error.message);
    });
  }
  
  /**
   * Handle a mention of the bot
   */
  private async handleMention(data: StreamData): Promise<void> {
    const tweet = data.data;
    const users = data.includes?.users || [];
    
    console.log('\n' + '='.repeat(50));
    console.log(`📥 New mention received!`);
    console.log(`Tweet ID: ${tweet.id}`);
    console.log(`Text: ${tweet.text}`);
    console.log(`Author ID: ${tweet.author_id}`);
    console.log(`Conversation ID: ${tweet.conversation_id}`);
    console.log('='.repeat(50));
    
    // IMPORTANT: Skip tweets from the bot itself to prevent reply loops
    if (tweet.author_id === this.botUserId) {
      console.log('[Bot] ⏭️  Skipping - this is our own tweet');
      return;
    }
    
    // Skip if we've already processed this tweet
    if (replyService.hasReplied(tweet.id)) {
      console.log('[Bot] ⏭️  Already replied to this tweet, skipping');
      return;
    }
    
    // Skip if we've already replied to this conversation
    // This prevents replying multiple times when users keep mentioning us in the same thread
    const conversationId = tweet.conversation_id || tweet.id;
    if (this.repliedConversations.has(conversationId)) {
      console.log(`[Bot] ⏭️  Already replied to conversation ${conversationId}, skipping`);
      return;
    }
    
    // Find the author
    const author = users.find(u => u.id === tweet.author_id);
    
    try {
      // Get the conversation thread for context
      console.log('[Bot] Fetching conversation thread...');
      const thread = await conversationService.getConversationThread(tweet.id);
      
      console.log(`[Bot] Found ${thread.tweets.length} tweets in thread`);
      console.log(conversationService.formatConversation(thread));
      
      // Extract travel context from the conversation
      const travelContext = conversationService.extractTravelContext(thread);
      
      // Generate recommendations
      console.log('[Bot] Generating recommendations...');
      const recommendations = await recommendationService.generateRecommendations(travelContext);
      
      // Format for tweet with link to our website (includes OG preview)
      const replyText = recommendationService.formatForTweet(recommendations);
      
      // Post reply
      console.log('[Bot] Posting reply...');
      await replyService.reply(replyText, tweet.id, author);
      
      // Mark this conversation as replied to
      this.repliedConversations.add(conversationId);
      
      console.log('✅ Successfully processed mention!');
      
    } catch (error) {
      console.error('[Bot] Failed to process mention:', error);
    }
  }
}

export const autoBot = new AutoBot();
