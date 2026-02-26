import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <header className="max-w-4xl mx-auto mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Claudia B2B
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Wholesale platform for Claudia — ladies fashion wear. Log in to browse stock and place orders.
        </p>
      </header>
      <nav className="max-w-4xl mx-auto flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Log in
        </Link>
        <Link
          href="/products"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Browse products
        </Link>
      </nav>
    </main>
  );
}
