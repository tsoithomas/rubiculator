// Pure, framework-agnostic conversion from (Chinese text, jyutping text)
// into a token list that can be serialized to an HTML string or to React nodes.

/** A single Han character paired with its jyutping annotation (annotation may be empty if syllables ran out). */
export interface RubyPair {
  base: string
  annotation: string
}

/** A run of contiguous Han characters that renders as one <ruby> element. */
export interface RubyToken {
  type: 'ruby'
  pairs: RubyPair[]
}

/** Literal text emitted outside of any <ruby> (punctuation, whitespace, latin, etc.). */
export interface TextToken {
  type: 'text'
  value: string
}

export type Token = RubyToken | TextToken

export interface ConversionResult {
  tokens: Token[]
  /** Number of Han characters found in the Chinese input. */
  hanCount: number
  /** Number of jyutping syllables parsed from the jyutping input. */
  syllableCount: number
}

const HAN = /\p{Script=Han}/u

/**
 * Parse the jyutping input into an ordered list of syllables.
 * Syllables are separated by whitespace; every non-alphanumeric character is
 * stripped from each token (so "toi4," -> "toi4"), and empty tokens are dropped.
 */
export function parseJyutping(jyutping: string): string[] {
  return jyutping
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((token) => token.length > 0)
}

/**
 * Convert Chinese characters + jyutping into a token list plus alignment counts.
 *
 * Each Han character consumes the next jyutping syllable; contiguous Han
 * characters group into a single <ruby> run, and any non-Han character flushes
 * the current run and is emitted as literal text (kept outside <ruby>).
 */
export function convert(chinese: string, jyutping: string): ConversionResult {
  const syllables = parseJyutping(jyutping)
  const tokens: Token[] = []

  let currentPairs: RubyPair[] = []
  let cursor = 0
  let hanCount = 0

  const flushRuby = () => {
    if (currentPairs.length > 0) {
      tokens.push({ type: 'ruby', pairs: currentPairs })
      currentPairs = []
    }
  }

  // Iterate by code point so CJK-extension characters (surrogate pairs) count as one.
  for (const char of chinese) {
    if (HAN.test(char)) {
      hanCount++
      const annotation = cursor < syllables.length ? syllables[cursor++] : ''
      currentPairs.push({ base: char, annotation })
    } else {
      flushRuby()
      // Merge consecutive literal characters into the previous text token.
      const last = tokens[tokens.length - 1]
      if (last && last.type === 'text') {
        last.value += char
      } else {
        tokens.push({ type: 'text', value: char })
      }
    }
  }
  flushRuby()

  return { tokens, hanCount, syllableCount: syllables.length }
}

export interface ExtractResult {
  /** Reconstructed Chinese text (base characters + literal punctuation, in order). */
  chinese: string
  /** Space-separated jyutping syllables, with punctuation mirrored from the source. */
  jyutping: string
  /** Number of <ruby> elements found (0 means the input had no ruby markup). */
  rubyCount: number
}

type JyutItem = { kind: 'syl' | 'punc'; text: string }

const WHITESPACE_WITH_NEWLINE = /^\s*\n\s*$/

/** Map common fullwidth / CJK punctuation to its halfwidth Latin equivalent. */
const FULLWIDTH_TO_HALFWIDTH: Record<string, string> = {
  '，': ',', '、': ',', '。': '.', '．': '.', '；': ';', '：': ':',
  '？': '?', '！': '!', '（': '(', '）': ')', '【': '[', '】': ']',
  '〔': '(', '〕': ')', '《': '<', '》': '>', '〈': '<', '〉': '>',
  '「': '"', '」': '"', '『': '"', '』': '"', '“': '"', '”': '"',
  '‘': "'", '’': "'", '～': '~', '－': '-', '％': '%', '　': ' ',
}

/** Convert fullwidth/CJK punctuation in a string to halfwidth Latin punctuation. */
export function toHalfwidthPunctuation(text: string): string {
  let out = ''
  for (const ch of text) out += FULLWIDTH_TO_HALFWIDTH[ch] ?? ch
  return out
}

/**
 * Reverse of {@link convert}: parse ruby HTML back into its component Chinese
 * characters and jyutping. The jyutping line mirrors the punctuation that sits
 * between ruby groups (e.g. "... toi4， m4 hou2 hip3 aa3。").
 */
export function parseRubyHtml(html: string): ExtractResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  let chinese = ''
  const jyut: JyutItem[] = []

  const walk = (node: Node, inRuby: boolean) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? ''
        // Skip pretty-print formatting (whitespace-only nodes containing a newline).
        if (WHITESPACE_WITH_NEWLINE.test(text)) continue
        chinese += text
        // Literal text outside a ruby is punctuation to mirror into the jyutping line.
        if (!inRuby) jyut.push({ kind: 'punc', text })
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue

      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'rt') {
        jyut.push({ kind: 'syl', text: el.textContent ?? '' })
      } else if (tag === 'rp') {
        // Ruby fallback parentheses — ignore.
        continue
      } else if (tag === 'rb') {
        chinese += el.textContent ?? ''
      } else if (tag === 'ruby') {
        walk(el, true)
      } else {
        walk(el, inRuby)
      }
    }
  }

  walk(doc.body, false)

  // Format the jyutping: syllables space-separated; punctuation attaches to the
  // preceding token with no leading space, and the next syllable re-adds a space.
  let jyutping = ''
  for (const item of jyut) {
    if (item.kind === 'syl') {
      const syl = item.text.trim()
      if (!syl) continue
      if (jyutping && !jyutping.endsWith(' ')) jyutping += ' '
      jyutping += syl
    } else {
      const punc = toHalfwidthPunctuation(item.text.trim())
      if (punc) {
        jyutping += punc
      } else if (jyutping && !jyutping.endsWith(' ')) {
        jyutping += ' '
      }
    }
  }

  return {
    chinese,
    jyutping,
    rubyCount: doc.body.querySelectorAll('ruby').length,
  }
}

/** Escape characters that are special in HTML text content. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Serialize tokens to an HTML string, with punctuation outside <ruby> and
 * <rp> fallback parentheses around each annotation. Characters without an
 * annotation (when syllables ran out) are emitted as a bare base.
 */
export function tokensToHtmlString(tokens: Token[]): string {
  let html = ''
  for (const token of tokens) {
    if (token.type === 'text') {
      html += escapeHtml(token.value)
      continue
    }
    html += '<ruby>'
    for (const { base, annotation } of token.pairs) {
      html += escapeHtml(base)
      if (annotation) {
        html += `<rp>(</rp><rt>${escapeHtml(annotation)}</rt><rp>)</rp>`
      }
    }
    html += '</ruby>'
  }
  return html
}
