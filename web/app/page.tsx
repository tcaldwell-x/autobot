export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <div className="text-6xl mb-6">🤖✈️</div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          AutoBot
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          AI-powered travel recommendations on X
        </p>
        
        <div className="bg-slate-800/50 rounded-xl p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold mb-3 text-blue-400">How it works</h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <span>Tweet about your travel plans and mention <code className="bg-slate-700 px-2 py-0.5 rounded">@autobot_demo</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <span>AutoBot analyzes your conversation for destinations, dates, and preferences</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <span>Get personalized hotel recommendations with booking links</span>
            </li>
          </ol>
        </div>
        
        <a 
          href="https://x.com/autobot_demo" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Follow @autobot_demo
        </a>
      </div>
      
      <footer className="absolute bottom-4 text-gray-500 text-sm">
        Powered by Expedia Group APIs
      </footer>
    </main>
  );
}
