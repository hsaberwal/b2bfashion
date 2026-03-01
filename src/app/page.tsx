import Link from "next/link";
import Image from "next/image";
import { HOMEPAGE_IMAGE_URLS } from "@/data/homepageImages";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Front page: ~12 photos of what we do (change every few months via src/data/homepageImages.ts) */}
      <section className="bg-je-offwhite border-b border-je-border">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <h2 className="text-xl font-semibold text-je-black tracking-tight mb-6 text-center">
            What we do
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {HOMEPAGE_IMAGE_URLS.map((src, i) => (
              <div
                key={i}
                className="aspect-square relative rounded overflow-hidden bg-je-cream border border-je-border"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  unoptimized={src.startsWith("http")}
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const parent = el.parentElement;
                    if (parent) {
                      const fallback = document.createElement("div");
                      fallback.className = "absolute inset-0 flex items-center justify-center text-je-muted text-xs p-2";
                      fallback.textContent = `Image ${i + 1}`;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-je-muted text-sm text-center mt-4">
            Add your images to <code className="bg-je-cream px-1 rounded">public/images/home/</code> (1.jpg–12.jpg) or edit <code className="bg-je-cream px-1 rounded">src/data/homepageImages.ts</code>.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto p-8">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-je-black tracking-tight">
            Claudia B2B
          </h1>
          <p className="text-je-muted mt-2 text-lg">
            Wholesale platform for Claudia — ladies fashion wear. Log in to browse stock and place orders.
          </p>
        </header>
        <nav className="flex flex-wrap gap-4">
          <Link
            href="/apply"
            className="px-5 py-2.5 border border-je-charcoal text-je-charcoal rounded-sm hover:bg-je-offwhite transition-colors font-medium"
          >
            Apply for access
          </Link>
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
      </section>
    </main>
  );
}
