import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: [
        "/auth/",
        "/connections/",
        "/dashboard",
        "/intelligence/",
        "/leagues/",
        "/logout",
        "/players/",
        "/settings/",
      ],
    },
    sitemap: "https://waiverops.com/sitemap.xml",
  };
}
