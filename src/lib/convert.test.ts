import { describe, it, expect } from 'vitest'
import {
  convert,
  parseJyutping,
  parseRubyHtml,
  tokensToHtmlString,
  tokensToStyledHtmlString,
  escapeHtml,
} from './convert'
import { DEFAULT_RUBY_STYLE } from './rubyStyle'

const CHINESE = '你行得上台，唔好怯呀。'
const JYUTPING = 'nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3.'

describe('parseJyutping', () => {
  it('splits on spaces and strips non-alphanumeric characters', () => {
    expect(parseJyutping(JYUTPING)).toEqual([
      'nei5', 'haang4', 'dak1', 'soeng5', 'toi4',
      'm4', 'hou2', 'hip3', 'aa3',
    ])
  })

  it('drops pure-punctuation and empty tokens', () => {
    expect(parseJyutping('  nei5 ,  ， haang4 ')).toEqual(['nei5', 'haang4'])
  })
})

describe('convert', () => {
  it('counts Han characters and syllables', () => {
    const { hanCount, syllableCount } = convert(CHINESE, JYUTPING)
    expect(hanCount).toBe(9)
    expect(syllableCount).toBe(9)
  })

  it('groups contiguous Han runs and keeps punctuation as literal text outside', () => {
    const { tokens } = convert(CHINESE, JYUTPING)
    expect(tokens.map((t) => t.type)).toEqual(['ruby', 'text', 'ruby', 'text'])
    expect(tokens[1]).toEqual({ type: 'text', value: '，' })
    expect(tokens[3]).toEqual({ type: 'text', value: '。' })
  })

  it('pairs each Han character with the next syllable', () => {
    const { tokens } = convert(CHINESE, JYUTPING)
    const first = tokens[0]
    if (first.type !== 'ruby') throw new Error('expected ruby')
    expect(first.pairs[0]).toEqual({ base: '你', annotation: 'nei5' })
    expect(first.pairs[4]).toEqual({ base: '台', annotation: 'toi4' })
  })

  it('leaves surplus Han characters without an annotation', () => {
    const { tokens, hanCount, syllableCount } = convert('你好', 'nei5')
    expect(hanCount).toBe(2)
    expect(syllableCount).toBe(1)
    const ruby = tokens[0]
    if (ruby.type !== 'ruby') throw new Error('expected ruby')
    expect(ruby.pairs[1]).toEqual({ base: '好', annotation: '' })
  })

  it('treats CJK-extension surrogate-pair characters as a single base', () => {
    const { hanCount } = convert('𠮷', 'jat1')
    expect(hanCount).toBe(1)
  })
})

describe('tokensToHtmlString', () => {
  it('produces ruby with rp fallback and punctuation outside', () => {
    const { tokens } = convert(CHINESE, JYUTPING)
    expect(tokensToHtmlString(tokens)).toBe(
      '<ruby>你<rp>(</rp><rt>nei5</rt><rp>)</rp>行<rp>(</rp><rt>haang4</rt><rp>)</rp>' +
        '得<rp>(</rp><rt>dak1</rt><rp>)</rp>上<rp>(</rp><rt>soeng5</rt><rp>)</rp>' +
        '台<rp>(</rp><rt>toi4</rt><rp>)</rp></ruby>，' +
        '<ruby>唔<rp>(</rp><rt>m4</rt><rp>)</rp>好<rp>(</rp><rt>hou2</rt><rp>)</rp>' +
        '怯<rp>(</rp><rt>hip3</rt><rp>)</rp>呀<rp>(</rp><rt>aa3</rt><rp>)</rp></ruby>。',
    )
  })

  it('emits a bare base when the annotation is empty', () => {
    const { tokens } = convert('你好', 'nei5')
    expect(tokensToHtmlString(tokens)).toBe(
      '<ruby>你<rp>(</rp><rt>nei5</rt><rp>)</rp>好</ruby>',
    )
  })

  it('escapes HTML-special characters in input', () => {
    expect(escapeHtml('a<b>&c')).toBe('a&lt;b&gt;&amp;c')
    const { tokens } = convert('A & B', 'x')
    expect(tokensToHtmlString(tokens)).toBe('A &amp; B')
  })
})

describe('parseRubyHtml', () => {
  it('round-trips Chinese and mirrors punctuation into jyutping', () => {
    const html = tokensToHtmlString(convert(CHINESE, JYUTPING).tokens)
    const out = parseRubyHtml(html)
    expect(out.chinese).toBe(CHINESE)
    // Punctuation is mirrored from the HTML, converted to halfwidth Latin.
    expect(out.jyutping).toBe(
      'nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3.',
    )
    expect(out.rubyCount).toBe(2)
  })

  it('ignores <rp> fallback parentheses', () => {
    const out = parseRubyHtml('<ruby>你<rp>(</rp><rt>nei5</rt><rp>)</rp></ruby>')
    expect(out.chinese).toBe('你')
    expect(out.jyutping).toBe('nei5')
  })

  it('handles multiple ruby groups with punctuation between them', () => {
    const out = parseRubyHtml(
      '<ruby>你<rt>nei5</rt>好<rt>hou2</rt></ruby>，<ruby>嗎<rt>maa3</rt></ruby>？',
    )
    expect(out.chinese).toBe('你好，嗎？')
    expect(out.jyutping).toBe('nei5 hou2, maa3?')
    expect(out.rubyCount).toBe(2)
  })

  it('returns rubyCount 0 and the raw text when there is no ruby markup', () => {
    const out = parseRubyHtml('just plain text')
    expect(out.rubyCount).toBe(0)
    expect(out.chinese).toBe('just plain text')
    expect(out.jyutping).toBe('just plain text')
  })

  it('decodes HTML entities', () => {
    const out = parseRubyHtml('<ruby>A<rt>x</rt></ruby> &amp; B')
    expect(out.chinese).toBe('A & B')
  })

  it('ignores newline formatting between pretty-printed ruby groups', () => {
    const out = parseRubyHtml(
      '<ruby>你<rt>nei5</rt></ruby>\n<ruby>好<rt>hou2</rt></ruby>',
    )
    expect(out.chinese).toBe('你好')
    expect(out.jyutping).toBe('nei5 hou2')
  })

  it('skips embedded <style> so a styled export round-trips cleanly', () => {
    const styled = tokensToStyledHtmlString(
      convert(CHINESE, JYUTPING).tokens,
      DEFAULT_RUBY_STYLE,
    )
    const out = parseRubyHtml(styled)
    expect(out.chinese).toBe(CHINESE)
    expect(out.jyutping).toBe('nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3.')
    // The CSS text inside <style> must not leak into the extracted content.
    expect(out.chinese).not.toContain('font-family')
    expect(out.jyutping).not.toContain('font-family')
  })
})

describe('tokensToStyledHtmlString', () => {
  it('wraps the exact plain-mode body in a scoped, self-contained container', () => {
    const { tokens } = convert(CHINESE, JYUTPING)
    const styled = tokensToStyledHtmlString(tokens, DEFAULT_RUBY_STYLE)
    const body = tokensToHtmlString(tokens)
    expect(styled.startsWith(
      '<div class="rubyculator-ruby" lang="zh-Hant" data-rb-position="over"><style>',
    )).toBe(true)
    expect(styled.endsWith(`</style>${body}</div>`)).toBe(true)
  })

  it('emits one fixed-width column per base character', () => {
    const { tokens } = convert('你好', 'nei5 hou2')
    const styled = tokensToStyledHtmlString(tokens, {
      ...DEFAULT_RUBY_STYLE,
      align: 'fixed-width',
    })
    const cols = styled.match(/<span class="ruby-col">/g)
    expect(cols).toHaveLength(2)
    expect(styled).toContain('.rubyculator-ruby .ruby-col')
  })

  it('splits each annotation into per-letter spans with no whitespace between them', () => {
    const { tokens } = convert('你', 'nei5')
    const styled = tokensToStyledHtmlString(tokens, {
      ...DEFAULT_RUBY_STYLE,
      align: 'spread',
    })
    expect(styled).toContain(
      '<rt class="rt-spread"><span class="rt-row">' +
        '<span>n</span><span>e</span><span>i</span><span>5</span></span></rt>',
    )
  })

  it('sanitizes a hostile custom font-family so it cannot break out of <style>', () => {
    const { tokens } = convert('你', 'nei5')
    const styled = tokensToStyledHtmlString(tokens, {
      ...DEFAULT_RUBY_STYLE,
      base: {
        ...DEFAULT_RUBY_STYLE.base,
        fontFamily: '</style><script>alert(1)</script>',
      },
    })
    expect(styled).not.toContain('</style><script>')
    // Only the intended closing tag (before the body) should appear.
    expect(styled.match(/<\/style>/g)).toHaveLength(1)
  })
})
