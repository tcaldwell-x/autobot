import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <div className="text-6xl mb-6">🤖❓</div>
        <h1 className="text-3xl font-bold mb-4">Recommendation Not Found</h1>
        <p className="text-gray-400 mb-8">
          This recommendation link may have expired or is invalid.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
