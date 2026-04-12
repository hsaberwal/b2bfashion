/**
 * JSON-LD structured data for the Organization.
 * Tells Google about Claudia.C as a business entity.
 * Rendered once site-wide in the root layout.
 */
export function OrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://claudia-c.com";

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Claudia.C",
    alternateName: "Claudia.C B2B",
    url: siteUrl,
    logo: `${siteUrl}/icons/icon-512.png`,
    description:
      "Wholesale ladies fashion supplier serving retailers and boutiques. Curated collections of tops, dresses, knitwear, jackets, and more at trade prices.",
    sameAs: [],
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "Claudia.C B2B",
    description: "Wholesale ladies fashion platform",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
    </>
  );
}
