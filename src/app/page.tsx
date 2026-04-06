import Link from "next/link";
import Image from "next/image";
import { HOMEPAGE_IMAGE_URLS } from "@/data/homepageImages";
import { HomepageGallery } from "@/components/HomepageGallery";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section — full-width feature image */}
      <section className="relative w-full" style={{ aspectRatio: "1920/800" }}>
        <Image
          src={HOMEPAGE_IMAGE_URLS[0]}
          alt="Claudia Collection"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="section-label text-white/80 mb-4">New Season</p>
          <h1 className="heading-serif text-white mb-8">
            The Collection
          </h1>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/products" className="btn-white">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Statement */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label mb-6">Claudia B2B</p>
          <h2 className="heading-serif text-je-black mb-6">
            Ladies Fashion, Wholesale
          </h2>
          <p className="text-je-muted text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Your wholesale destination for Claudia — curated ladies fashion wear.
            Browse our latest collections, place bulk orders, and grow your retail business.
          </p>
        </div>
      </section>

      {/* Two-Column Feature */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative aspect-[3/4] md:aspect-auto">
          <Image
            src={HOMEPAGE_IMAGE_URLS[1]}
            alt="Featured collection"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center px-4">
            <h3 className="font-serif text-2xl md:text-3xl text-white mb-4">New Arrivals</h3>
            <Link href="/products" className="btn-white">
              View Collection
            </Link>
          </div>
        </div>
        <div className="relative aspect-[3/4] md:aspect-auto">
          <Image
            src={HOMEPAGE_IMAGE_URLS[2]}
            alt="Seasonal styles"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center px-4">
            <h3 className="font-serif text-2xl md:text-3xl text-white mb-4">Best Sellers</h3>
            <Link href="/products" className="btn-white">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16 md:py-24 px-4 bg-je-offwhite">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-4">What We Do</p>
            <h2 className="font-serif text-3xl md:text-4xl text-je-black">
              Our Latest Looks
            </h2>
          </div>
          <HomepageGallery urls={HOMEPAGE_IMAGE_URLS.slice(3)} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-4 bg-je-cream">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-6">
            Start Ordering Today
          </h2>
          <p className="text-je-muted text-base md:text-lg mb-10 leading-relaxed">
            Apply for a wholesale account to access our full catalogue, exclusive pricing, and seasonal collections.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/apply" className="btn-primary">
              Apply for Access
            </Link>
            <Link href="/login" className="btn-outline">
              Log In
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
