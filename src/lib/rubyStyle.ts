// Style/alignment configuration for ruby (jyutping) rendering, shared by the
// live preview (App.tsx) and the copyable styled HTML export (convert.ts).

export type RubyPosition = 'over' | 'under'

export type RubyAlignMode =
  | 'space-around' // native ruby-align: space-around (today's default look)
  | 'center' // native ruby-align: center
  | 'start' // native ruby-align: start
  | 'space-between' // native ruby-align: space-between
  | 'fixed-width' // custom: fixed-width column per base character
  | 'spread' // custom: jyutping letters justified across the column width

export const ALIGN_MODE_INFO: Record<
  RubyAlignMode,
  { label: string; caption: string }
> = {
  'space-around': {
    label: 'Space around (default)',
    caption: 'Ruby text takes the space it needs; base characters spread out to fit.',
  },
  center: {
    label: 'Center',
    caption: 'Ruby text centered over the base without pushing characters apart. Firefox only — other browsers fall back to the default.',
  },
  start: {
    label: 'Start',
    caption: 'Ruby text aligned to the start edge of the base. Firefox only — other browsers fall back to the default.',
  },
  'space-between': {
    label: 'Space between',
    caption: 'Space distributed between ruby text segments. Firefox only — other browsers fall back to the default.',
  },
  'fixed-width': {
    label: 'Fixed character width',
    caption: 'Each base character gets a fixed-width column; ruby text may overhang if a syllable is long. Renders consistently in all browsers.',
  },
  spread: {
    label: 'Spread letters',
    caption: 'Ruby letters are justified edge-to-edge across the character column. Renders consistently in all browsers.',
  },
}

export interface FontOption {
  id: string
  label: string
  stack: string
}

export const BASE_FONT_OPTIONS: FontOption[] = [
  {
    id: 'cjk-default',
    label: 'Noto Sans HK (default)',
    stack:
      "'Noto Sans HK', 'PingFang HK', 'Hiragino Sans', 'Microsoft JhengHei', system-ui, sans-serif",
  },
  {
    id: 'noto-serif-hk',
    label: 'Noto Serif HK',
    stack: "'Noto Serif HK', 'Songti TC', serif",
  },
  {
    id: 'kai',
    label: 'Kaiti (楷體)',
    stack: "'Kaiti SC', 'KaiTi', 'BiauKai', serif",
  },
  {
    id: 'system',
    label: 'System UI',
    stack: 'system-ui, -apple-system, sans-serif',
  },
  { id: 'custom', label: 'Custom…', stack: '' },
]

export const RUBY_FONT_OPTIONS: FontOption[] = [
  {
    id: 'ui-default',
    label: 'Inter (default)',
    stack: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'mono',
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  },
  {
    id: 'system',
    label: 'System UI',
    stack: 'system-ui, -apple-system, sans-serif',
  },
  { id: 'custom', label: 'Custom…', stack: '' },
]

export interface RubyStyleConfig {
  base: {
    fontFamily: string
    fontSize: number // rem
    fontWeight: number
    color: string // '#rrggbb'
    letterSpacing: number // em
    lineHeight: number // unitless
  }
  ruby: {
    fontFamily: string
    fontSizeEm: number // ratio relative to base font-size
    fontWeight: number
    color: string
    letterSpacing: number // em
    gapEm: number // gap between ruby text and base
  }
  position: RubyPosition
  align: RubyAlignMode
  columnWidthCh: number // used by 'fixed-width' and 'spread' modes
}

// Reproduces today's hardcoded CSS exactly — shipping this must not change
// the app's default appearance.
export const DEFAULT_RUBY_STYLE: RubyStyleConfig = {
  base: {
    fontFamily: BASE_FONT_OPTIONS[0].stack,
    fontSize: 2.3,
    fontWeight: 400,
    color: '#f4ebee',
    letterSpacing: 0,
    lineHeight: 2.5,
  },
  ruby: {
    fontFamily: RUBY_FONT_OPTIONS[0].stack,
    fontSizeEm: 0.34,
    fontWeight: 500,
    color: '#f43f5e',
    letterSpacing: 0.01,
    gapEm: 0.14,
  },
  position: 'over',
  align: 'space-around',
  columnWidthCh: 2.4,
}

/**
 * Allowlist-sanitize a free-text font-family value before it is interpolated
 * into a literal <style> block in exported HTML. Strips anything outside
 * letters, digits, spaces, commas, quotes, and hyphens.
 */
export function sanitizeFontFamily(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ,'"-]/g, '')
}

export interface ResolvedRubyStyle {
  baseFontFamily: string
  baseFontSize: string
  baseFontWeight: string
  baseColor: string
  baseLetterSpacing: string
  baseLineHeight: string
  rtFontFamily: string
  rtFontSize: string
  rtFontWeight: string
  rtColor: string
  rtLetterSpacing: string
  rtGap: string
  rubyPosition: RubyPosition
  rubyAlign: 'space-around' | 'center' | 'start' | 'space-between'
  colWidth: string
}

const NATIVE_ALIGN_MODES = new Set<RubyAlignMode>([
  'space-around',
  'center',
  'start',
  'space-between',
])

/**
 * Single source of truth: resolves a config into literal, ready-to-emit CSS
 * values. Both the live-preview inline style and the exported <style> block
 * are built from this same object so they can never drift apart.
 */
export function resolveRubyStyle(config: RubyStyleConfig): ResolvedRubyStyle {
  const baseFontFamily = sanitizeFontFamily(config.base.fontFamily)
  const rtFontFamily = sanitizeFontFamily(config.ruby.fontFamily)

  return {
    baseFontFamily,
    baseFontSize: `${config.base.fontSize}rem`,
    baseFontWeight: `${config.base.fontWeight}`,
    baseColor: config.base.color,
    baseLetterSpacing: `${config.base.letterSpacing}em`,
    baseLineHeight: `${config.base.lineHeight}`,
    rtFontFamily,
    rtFontSize: `${config.ruby.fontSizeEm}em`,
    rtFontWeight: `${config.ruby.fontWeight}`,
    rtColor: config.ruby.color,
    rtLetterSpacing: `${config.ruby.letterSpacing}em`,
    rtGap: `${config.ruby.gapEm}em`,
    rubyPosition: config.position,
    rubyAlign: NATIVE_ALIGN_MODES.has(config.align)
      ? (config.align as ResolvedRubyStyle['rubyAlign'])
      : 'space-around',
    colWidth: `${config.columnWidthCh}ch`,
  }
}

/** Maps a ResolvedRubyStyle to the `--rb-*` custom-property object used as
 *  the live preview's inline `style` prop. */
export function rubyStyleToCssVars(
  resolved: ResolvedRubyStyle,
): Record<string, string> {
  return {
    '--rb-base-font-family': resolved.baseFontFamily,
    '--rb-base-font-size': resolved.baseFontSize,
    '--rb-base-font-weight': resolved.baseFontWeight,
    '--rb-base-color': resolved.baseColor,
    '--rb-base-letter-spacing': resolved.baseLetterSpacing,
    '--rb-base-line-height': resolved.baseLineHeight,
    '--rb-rt-font-family': resolved.rtFontFamily,
    '--rb-rt-font-size': resolved.rtFontSize,
    '--rb-rt-font-weight': resolved.rtFontWeight,
    '--rb-rt-color': resolved.rtColor,
    '--rb-rt-letter-spacing': resolved.rtLetterSpacing,
    '--rb-rt-gap': resolved.rtGap,
    '--rb-position': resolved.rubyPosition,
    '--rb-align': resolved.rubyAlign,
    '--rb-col-width': resolved.colWidth,
  }
}
