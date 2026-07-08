import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RUBY_STYLE,
  resolveRubyStyle,
  rubyStyleToCssVars,
  sanitizeFontFamily,
} from './rubyStyle'

describe('resolveRubyStyle', () => {
  it('reproduces today’s hardcoded CSS values from the defaults', () => {
    const r = resolveRubyStyle(DEFAULT_RUBY_STYLE)
    expect(r.baseFontSize).toBe('2.3rem')
    expect(r.baseFontWeight).toBe('400')
    expect(r.baseColor).toBe('#f4ebee')
    expect(r.baseLineHeight).toBe('2.5')
    expect(r.rtFontSize).toBe('0.34em')
    expect(r.rtFontWeight).toBe('500')
    expect(r.rtColor).toBe('#f43f5e')
    expect(r.rtLetterSpacing).toBe('0.01em')
    expect(r.rtGap).toBe('0.14em')
    expect(r.rubyPosition).toBe('over')
    expect(r.rubyAlign).toBe('space-around')
  })

  it('passes native ruby-align keywords through unchanged', () => {
    expect(resolveRubyStyle({ ...DEFAULT_RUBY_STYLE, align: 'center' }).rubyAlign).toBe(
      'center',
    )
    expect(
      resolveRubyStyle({ ...DEFAULT_RUBY_STYLE, align: 'space-between' }).rubyAlign,
    ).toBe('space-between')
  })

  it('falls back to space-around for the custom markup modes', () => {
    expect(
      resolveRubyStyle({ ...DEFAULT_RUBY_STYLE, align: 'fixed-width' }).rubyAlign,
    ).toBe('space-around')
    expect(
      resolveRubyStyle({ ...DEFAULT_RUBY_STYLE, align: 'spread' }).rubyAlign,
    ).toBe('space-around')
  })
})

describe('rubyStyleToCssVars', () => {
  it('maps resolved values onto --rb-* custom properties', () => {
    const vars = rubyStyleToCssVars(resolveRubyStyle(DEFAULT_RUBY_STYLE))
    expect(vars['--rb-base-font-size']).toBe('2.3rem')
    expect(vars['--rb-rt-color']).toBe('#f43f5e')
    expect(vars['--rb-position']).toBe('over')
    expect(vars['--rb-align']).toBe('space-around')
    expect(vars['--rb-col-width']).toBe('2.4ch')
  })
})

describe('sanitizeFontFamily', () => {
  it('strips angle brackets and other CSS-unsafe characters', () => {
    expect(sanitizeFontFamily('</style><script>alert(1)</script>')).toBe(
      'stylescriptalert1script',
    )
  })

  it('leaves a normal quoted font stack untouched', () => {
    const stack = "'Noto Sans HK', 'PingFang HK', system-ui, sans-serif"
    expect(sanitizeFontFamily(stack)).toBe(stack)
  })
})
