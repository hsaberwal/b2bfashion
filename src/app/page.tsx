import Link from "next/link";
import { HOMEPAGE_IMAGE_URLS } from "@/data/homepageImages";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { HeroSection } from "@/components/HeroSection";
import { LatestLooks } from "@/components/LatestLooks";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero + Two-Column — pulls from featured products */}
      <HeroSection fallbackImages={HOMEPAGE_IMAGE_URLS} />

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

      {/* Featured Products Grid */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-4">Curated For You</p>
            <h2 className="font-serif text-3xl md:text-4xl text-je-black">
              Featured Styles
            </h2>
          </div>
          <FeaturedProducts />
        </div>
      </section>

      {/* Our Latest Looks — rotating product images */}
      <section className="py-16 md:py-24 px-4 bg-je-offwhite">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-4">What We Do</p>
            <h2 className="font-serif text-3xl md:text-4xl text-je-black">
              Our Latest Looks
            </h2>
          </div>
          <LatestLooks />
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
