import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <header className="max-w-4xl mx-auto mb-12">
        <h1 className="text-3xl font-bold text-je-black tracking-tight">
          Claudia B2B
        </h1>
        <p className="text-je-muted mt-2 text-lg">
          Wholesale platform for Claudia — ladies fashion wear. Log in to browse stock and place orders.
        </p>
      </header>
      <nav className="max-w-4xl mx-auto flex gap-4">
        <Link
          href="/login"
          className="px-5 py-2.5 bg-je-black text-je-white rounded-sm hover:bg-je-charcoal transition-colors font-medium"
        >
          Log in
        </Link>
        <Link
          href="/products"
          className="px-5 py-2.5 border border-je-border bg-je-white text-je-black rounded-sm hover:bg-je-offwhite transition-colors font-medium"
        >
          Browse products
        </Link>
      </nav>
    </main>
  );
}
