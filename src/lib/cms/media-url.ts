/**
 * Cache-bust image URLs so browsers always show the latest upload after CMS edits.
 * External URLs get a version query when `version` is provided.
 */
export function mediaUrl(
  src: string | undefined | null,
  version?: string | number | null
): string {
  if (!src) return "";
  const v = version != null && version !== "" ? String(version) : "";
  // Absolute URLs (http/https) or data/blob — still allow cache bust for http
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;

  if (!v) return src;

  try {
    // Relative /uploads paths
    if (src.startsWith("/")) {
      const joiner = src.includes("?") ? "&" : "?";
      return `${src}${joiner}v=${encodeURIComponent(v)}`;
    }
    const u = new URL(src);
    u.searchParams.set("v", v);
    return u.toString();
  } catch {
    const joiner = src.includes("?") ? "&" : "?";
    return `${src}${joiner}v=${encodeURIComponent(v)}`;
  }
}
