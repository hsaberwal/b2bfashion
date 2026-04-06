import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-je-black text-white py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label text-white/60 mb-4">About Us</p>
          <h1 className="heading-serif text-white mb-6">Claudia B2B</h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Your trusted wholesale partner for ladies fashion. We supply retailers
            and boutiques with curated collections designed for the modern woman.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">Our Story</p>
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-6">
            Fashion for Every Woman
          </h2>
          <div className="text-je-muted text-base md:text-lg leading-relaxed space-y-4">
            <p>
              Claudia B2B is a wholesale ladies fashion platform built for retailers who want
              quality, style, and value. We curate collections that cater to women aged 35–55,
              offering a range of tops, blouses, knitwear, dresses, skirts, jackets, and trousers.
            </p>
            <p>
              Our mission is simple: make it easy for boutiques and retailers to access beautiful,
              well-made fashion at competitive wholesale prices. Every piece in our collection is
              chosen with care, ensuring your customers will love what they find.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-4 bg-je-offwhite">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">How It Works</p>
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-10">
            Ordering Made Simple
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center text-sm font-bold mb-4">
                1
              </div>
              <h3 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-2">
                Browse
              </h3>
              <p className="text-sm text-je-muted leading-relaxed">
                Explore our full catalogue of garments. Filter by category, colour, or season.
                Add items to your cart — no account needed to start.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center text-sm font-bold mb-4">
                2
              </div>
              <h3 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-2">
                Register
              </h3>
              <p className="text-sm text-je-muted leading-relaxed">
                Create a wholesale account and apply for access. Once approved, you&apos;ll see
                trade pricing on all garments.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center text-sm font-bold mb-4">
                3
              </div>
              <h3 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-2">
                Order
              </h3>
              <p className="text-sm text-je-muted leading-relaxed">
                Checkout with delivery details and choose how to pay — full payment, 10% deposit,
                or invoice. It&apos;s that simple.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">Why Claudia</p>
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-10">
            Why Retailers Choose Us
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-1 bg-je-black shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-je-black mb-1">Curated Collections</h3>
                <p className="text-sm text-je-muted">Every piece is hand-selected for quality, fit, and style that your customers will love.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1 bg-je-black shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-je-black mb-1">Competitive Wholesale Pricing</h3>
                <p className="text-sm text-je-muted">Trade prices that give you healthy margins. Pricing visible once your account is approved.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1 bg-je-black shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-je-black mb-1">Flexible Payment</h3>
                <p className="text-sm text-je-muted">Pay in full, secure with a 10% deposit, or order on invoice — whatever suits your business.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1 bg-je-black shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-je-black mb-1">Pack Ordering</h3>
                <p className="text-sm text-je-muted">Order in packs with minimum quantities that make sense for retail. No single-piece orders.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="py-20 md:py-28 px-4 bg-je-cream">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-6">
            Get in Touch
          </h2>
          <p className="text-je-muted text-base md:text-lg mb-10 leading-relaxed">
            Ready to stock Claudia in your store? Apply for a wholesale account or contact our
            team for more information.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/apply" className="btn-primary">
              Apply for Access
            </Link>
            <Link href="/products" className="btn-outline">
              Browse Garments
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
