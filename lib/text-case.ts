/**
 * Application-wide text casing helpers.
 * - Title case → headings, nav, card titles
 * - Sentence case → short descriptions, labels
 * - Paragraph case → body / multi-sentence copy
 */

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "vs",
  "via",
  "with",
])

/** Brand / org tokens that must keep fixed casing */
const PRESERVE = new Map<string, string>([
  ["g100", "G100"],
  ["wef", "WEF"],
  ["wicci", "WICCI"],
  ["sheconomy", "SHEconomy"],
  ["he-for-she", "He-for-She"],
  ["she-for-she", "She-for-She"],
  ["ceo", "CEO"],
  ["eu", "EU"],
  ["uk", "UK"],
  ["usa", "USA"],
  ["uae", "UAE"],
  ["un", "UN"],
  ["ai", "AI"],
  ["phd", "PhD"],
  ["dr", "Dr"],
  ["mr", "Mr"],
  ["mrs", "Mrs"],
  ["ms", "Ms"],
])

function decodeBasicEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

/** Collapse whitespace and flatten ALL-CAPS / noisy CMS strings. */
export function normalizeTextSource(input: string): string {
  if (!input) return ""
  let s = decodeBasicEntities(String(input)).replace(/\s+/g, " ").trim()
  if (!s) return ""

  const letters = s.replace(/[^A-Za-z]/g, "")
  if (letters.length >= 4) {
    const upper = (letters.match(/[A-Z]/g) || []).length
    if (upper / letters.length >= 0.62) {
      s = s.toLowerCase()
    }
  }
  return s
}

function preserveToken(word: string): string | null {
  const bare = word.replace(/[^A-Za-z0-9-]/g, "")
  if (!bare) return null
  const key = bare.toLowerCase()
  const fixed = PRESERVE.get(key)
  if (!fixed) return null
  return word.replace(bare, fixed)
}

function capitalizeWord(word: string): string {
  const preserved = preserveToken(word)
  if (preserved) return preserved
  if (!word) return word
  // Keep already mixed tokens like McDonald if present
  if (/[a-z]/.test(word) && /[A-Z]/.test(word) && word.length > 2) {
    return word
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Title Case — for page titles, section headings, nav, cards.
 * Small words stay lowercase unless first/last.
 */
export function toTitleCase(input: string): string {
  const s = normalizeTextSource(input)
  if (!s) return ""

  const words = s.split(" ")
  return words
    .map((word, index) => {
      const preserved = preserveToken(word)
      if (preserved) return preserved

      const bare = word.replace(/[^A-Za-z0-9']/g, "").toLowerCase()
      const isEdge = index === 0 || index === words.length - 1
      if (!isEdge && SMALL_WORDS.has(bare)) {
        return word.toLowerCase()
      }
      // Hyphenated compounds
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => capitalizeWord(part))
          .join("-")
      }
      return capitalizeWord(word)
    })
    .join(" ")
}

/**
 * Sentence case — first letter capital, rest lower (with brand tokens preserved).
 */
export function toSentenceCase(input: string): string {
  const s = normalizeTextSource(input)
  if (!s) return ""

  const lower = s
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      const preserved = preserveToken(part)
      if (preserved) return preserved
      return part.toLowerCase()
    })
    .join("")

  return lower.replace(/^[a-z]/, (c) => c.toUpperCase())
}

/**
 * Paragraph case — each sentence gets sentence case; blank lines preserved.
 */
export function toParagraphCase(input: string): string {
  if (!input) return ""
  const raw = decodeBasicEntities(String(input)).replace(/\r\n/g, "\n").trim()
  if (!raw) return ""

  const blocks = raw.split(/\n{2,}/)
  return blocks
    .map((block) => {
      const flat = block.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim()
      if (!flat) return ""
      // Split on sentence boundaries while keeping delimiters
      const parts = flat.split(/([.!?]+["']?\s+)/)
      let out = ""
      for (let i = 0; i < parts.length; i++) {
        const chunk = parts[i]
        if (!chunk) continue
        if (/^[.!?]+/.test(chunk)) {
          out += chunk
          continue
        }
        out += toSentenceCase(chunk)
      }
      return out.trim()
    })
    .filter(Boolean)
    .join("\n\n")
}

/** Apply title case to plain text inside simple heading tags. */
export function titleCaseHtmlHeadings(html: string): string {
  if (!html) return html
  return html.replace(
    /<(h[1-6])(\b[^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string, inner: string) => {
      if (/<(?:h[1-6]|p|div|ul|ol|table|figure)\b/i.test(inner)) return full
      const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      if (!text) return full
      // Preserve anchors/markup when present: only retitle pure text headings
      if (/<[a-z]/i.test(inner)) {
        return `<${tag}${attrs}>${inner.replace(
          />([^<]+)</g,
          (_, t: string) => `>${toTitleCase(t)}<`
        )}</${tag}>`
      }
      return `<${tag}${attrs}>${toTitleCase(text)}</${tag}>`
    }
  )
}

/** Apply paragraph/sentence case to simple paragraph nodes. */
export function paragraphCaseHtmlParagraphs(html: string): string {
  if (!html) return html
  return html.replace(
    /<(p)(\b[^>]*)>([\s\S]*?)<\/p>/gi,
    (full, tag: string, attrs: string, inner: string) => {
      if (/<(?:ul|ol|table|figure|blockquote)\b/i.test(inner)) return full
      if (!/[A-Za-z]/.test(inner)) return full
      // Pure text paragraphs
      if (!/<[a-z]/i.test(inner)) {
        return `<${tag}${attrs}>${toParagraphCase(inner)}</${tag}>`
      }
      // Text-only children mixed with inline tags
      return `<${tag}${attrs}>${inner.replace(
        /(^|>)([^<]+)(<|$)/g,
        (_m, pre: string, text: string, post: string) => {
          if (!/[A-Za-z]/.test(text)) return `${pre}${text}${post}`
          return `${pre}${toParagraphCase(text)}${post}`
        }
      )}</${tag}>`
    }
  )
}
