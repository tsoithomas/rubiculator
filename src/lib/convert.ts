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
