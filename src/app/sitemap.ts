import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL || "https://patriotic-app.onrender.com";

const staticPaths = [
  "/",
  "/about",
  "/programs",
  "/projects",
  "/events",
  "/news",
  "/gallery",
  "/membership",
  "/volunteer",
  "/donate",
  "/opportunities",
  "/resources",
  "/forum",
  "/contact",
  "/map",
  "/search",
  "/impact",
  "/governance",
  "/faq",
  "/careers",
  "/press",
  "/privacy",
  "/terms",
  "/accessibility",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return staticPaths.map((path) => ({
    url: `${base.replace(/\/$/, "")}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/membership" || path === "/donate" ? 0.9 : 0.7,
  }));
}
