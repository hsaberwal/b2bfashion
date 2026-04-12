import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://claudia-c.com";

/**
 * Breadcrumb navigation with JSON-LD structured data for SEO.
 */
export function Breadcrumbs({ items }: Props) {
  const itemListElement = items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.label,
    item: item.href ? `${siteUrl}${item.href}` : undefined,
  }));

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-je-muted">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {item.href && i < items.length - 1 ? (
                <Link href={item.href} className="hover:text-je-black transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-je-charcoal">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </>
  );
}
