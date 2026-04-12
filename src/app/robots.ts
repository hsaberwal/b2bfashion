import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://claudia-c.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/cart",
          "/checkout/",
          "/account",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/claim-admin",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
