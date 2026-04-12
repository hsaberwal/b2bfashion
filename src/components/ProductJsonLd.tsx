/**
 * JSON-LD structured data for a Product.
 * Helps Google show rich product results.
 * Note: We don't include price here because pricing is restricted to approved trade buyers.
 */
type Props = {
  id: string;
  name: string;
  description: string;
  category: string;
  colour: string;
  sku: string;
  images: string[];
  url: string;
};

export function ProductJsonLd({ id, name, description, category, colour, sku, images, url }: Props) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url,
    name,
    description: description || `${name} — wholesale ${category.toLowerCase()} from Claudia.C`,
    sku,
    category,
    color: colour,
    image: images.length > 0 ? images : undefined,
    brand: {
      "@type": "Brand",
      name: "Claudia.C",
    },
    offers: {
      "@type": "Offer",
      url,
      availability: "https://schema.org/InStock",
      priceCurrency: "GBP",
      seller: {
        "@type": "Organization",
        name: "Claudia.C B2B",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      // Suppress hydration warnings for this exact pattern (recommended in Next.js docs)
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      // We use the id as a stable React key in the parent
      key={`product-jsonld-${id}`}
    />
  );
}
