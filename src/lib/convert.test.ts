import { describe, it, expect } from 'vitest'
import { convert, parseJyutping, tokensToHtmlString, escapeHtml } from './convert'

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
