"use client";

import Link from "next/link";

const PAGES: { href: string; title: string; desc: string; group: string }[] = [
  {
    group: "Marketing",
    href: "/about",
    title: "About Us",
    desc: "Hero, story, why-choose-us, and call-to-action.",
  },
  {
    group: "Footer",
    href: "/?footer=edit",
    title: "Footer details",
    desc: "Brand, address, company number, VAT, contact email — edited from the footer on any public page.",
  },
  {
    group: "Legal",
    href: "/terms",
    title: "Terms & Conditions",
    desc: "Wholesale terms, payment, cancellations.",
  },
  {
    group: "Legal",
    href: "/privacy",
    title: "Privacy Policy",
    desc: "Data handling, cookies, and customer rights.",
  },
  {
    group: "Legal",
    href: "/shipping",
    title: "Shipping Policy",
    desc: "Delivery options, lead times, fees.",
  },
  {
    group: "Legal",
    href: "/returns",
    title: "Returns Policy",
    desc: "Refund and exchange rules.",
  },
];

export default function AdminPagesPage() {
  const groups = Array.from(new Set(PAGES.map((p) => p.group)));

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Pages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit your site&apos;s static content. Open a page, then click &ldquo;Edit Page&rdquo; at the top while signed in as admin.
          </p>
        </div>

        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g}>
              <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 px-1">
                {g}
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {PAGES.filter((p) => p.group === g).map((p) => (
                    <li key={p.href}>
                      <Link
                        href={p.href}
                        target="_blank"
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0 mt-0.5">
                          <span className="hidden sm:inline">Open</span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className="group-hover:text-gray-900"
                          >
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-medium mb-1">How editing works</p>
          <p className="text-blue-800">
            Each page opens in a new tab. While signed in as an admin, a blue &ldquo;Edit Page&rdquo;
            bar appears at the top — click it to make the content editable, then save.
          </p>
        </div>
      </div>
    </div>
  );
}
