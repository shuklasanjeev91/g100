/** Rewrite legacy local WP upload hosts to the live CDN. */
export function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url) return ""
  return url
    .replace(
      /^https?:\/\/localhost(?::\d+)?\/G100\/wp-content\//i,
      "https://www.g100.in/wp-content/"
    )
    .replace(
      /^https?:\/\/127\.0\.0\.1(?::\d+)?\/G100\/wp-content\//i,
      "https://www.g100.in/wp-content/"
    )
    .replace(/^http:\/\/(www\.)?g100\.in\//i, "https://www.g100.in/")
}

function hasImageExtension(src: string) {
  return /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(src)
}

/** True when a URL is a real displayable raster/svg image (not CSS, thumbs stubs, etc.). */
export function isUsableImageUrl(url: string | null | undefined): boolean {
  const src = normalizeMediaUrl(url)
  if (!src) return false
  const lower = src.toLowerCase()
  if (lower.includes("uc_creative")) return false
  if (lower.includes("/ac_assets/")) return false
  if (lower.endsWith(".css") || lower.endsWith(".js")) return false
  if (lower.includes("/elementor/thumbs/")) return false
  if (!hasImageExtension(src)) return false
  return true
}

/**
 * Like isUsableImageUrl but can keep Elementor thumbs (Press cards often only
 * have thumb URLs in the HTML export).
 */
export function isDisplayableImageUrl(
  url: string | null | undefined,
  options?: { allowThumbs?: boolean }
): boolean {
  if (options?.allowThumbs) {
    const src = normalizeMediaUrl(url)
    if (!src) return false
    const lower = src.toLowerCase()
    if (lower.includes("uc_creative")) return false
    if (lower.includes("/ac_assets/")) return false
    if (lower.endsWith(".css") || lower.endsWith(".js")) return false
    if (!hasImageExtension(src)) return false
    return true
  }
  return isUsableImageUrl(url)
}

/** Prefer a full-size upload over an Elementor thumb when both exist. */
export function preferFullImage(
  src: string,
  gallery: string[] | null | undefined
): string {
  const normalized = normalizeMediaUrl(src)
  if (!normalized.includes("/elementor/thumbs/")) return normalized

  const file = normalized.split("/").pop() || ""
  const stem = file
    .replace(/-p[a-z0-9]{16,}(?=\.[a-z]+$)/i, "")
    .replace(/-\d+x\d+(?=\.[a-z]+$)/i, "")
    .replace(/\.[a-z]+$/i, "")
    .toLowerCase()

  if (stem.length < 4) return normalized

  for (const candidate of gallery ?? []) {
    const full = normalizeMediaUrl(candidate)
    if (!full || full.includes("/elementor/thumbs/")) continue
    if (!isUsableImageUrl(full)) continue
    const name = (full.split("/").pop() || "").toLowerCase()
    if (
      name.includes(stem) ||
      stem.includes(name.replace(/\.[a-z]+$/i, "").slice(0, 12))
    ) {
      return full
    }
  }
  return normalized
}
