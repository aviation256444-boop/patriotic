import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL || "https://patriotic-app.onrender.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/super-admin",
          "/super-admin/",
          "/dashboard",
          "/dashboard/",
          "/setup",
          "/setup/",
          "/api/",
        ],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
