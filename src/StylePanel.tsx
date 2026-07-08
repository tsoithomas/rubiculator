import { useState } from 'react'
import {
  ALIGN_MODE_INFO,
  BASE_FONT_OPTIONS,
  DEFAULT_RUBY_STYLE,
  RUBY_FONT_OPTIONS,
  type FontOption,
  type RubyAlignMode,
  type RubyStyleConfig,
} from './lib/rubyStyle'

const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800]
const ALIGN_MODES = Object.keys(ALIGN_MODE_INFO) as RubyAlignMode[]

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      style={{
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A labelled range slider that shows its current value. */
function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="style-control">
      <span className="style-control-head">
        <span className="style-control-label">{label}</span>
        <span className="style-control-value">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="style-control">
      <span className="style-control-label">{label}</span>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="style-control">
      <span className="style-control-label">{label}</span>
      <span className="color-control">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="color-value">{value}</span>
      </span>
    </label>
  )
}

/** Font-family control: a preset <select> plus a free-text field when the
 *  chosen stack isn't one of the presets ("Custom…"). */
function FontControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FontOption[]
  onChange: (stack: string) => void
}) {
  const preset = options.find((o) => o.stack === value && o.id !== 'custom')
  const isCustom = !preset
  const selectValue = preset ? preset.id : 'custom'

  return (
    <div className="style-control">
      <label className="style-control">
        <span className="style-control-label">{label}</span>
        <select
          className="select"
          value={selectValue}
          onChange={(e) => {
            const opt = options.find((o) => o.id === e.target.value)
            if (!opt) return
            // Switching to "Custom…" seeds the free-text field with the
            // current value so the user edits rather than starts from blank.
            onChange(opt.id === 'custom' ? value : opt.stack)
          }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {isCustom && (
        <input
          type="text"
          className="select custom-font-input"
          value={value}
          spellCheck={false}
          placeholder="'Font Name', fallback, sans-serif"
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} custom font family`}
        />
      )}
    </div>
  )
}

export function StylePanel({
  config,
  onChange,
}: {
  config: RubyStyleConfig
  onChange: (next: RubyStyleConfig) => void
}) {
  const [open, setOpen] = useState(false)

  const setBase = (patch: Partial<RubyStyleConfig['base']>) =>
    onChange({ ...config, base: { ...config.base, ...patch } })
  const setRuby = (patch: Partial<RubyStyleConfig['ruby']>) =>
    onChange({ ...config, ruby: { ...config.ruby, ...patch } })

  const columnar =
    config.align === 'fixed-width' || config.align === 'spread'

  return (
    <section className="panel style-panel">
      <div className="panel-head">
        <button
          type="button"
          className="style-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <h2>Style</h2>
          <ChevronIcon open={open} />
        </button>
        {open && (
          <button
            type="button"
            className="text-btn"
            onClick={() => onChange(DEFAULT_RUBY_STYLE)}
          >
            Reset
          </button>
        )}
      </div>

      {open && (
        <div className="style-body">
          <div className="style-grid">
            <div className="style-col">
              <h3 className="style-col-title">Chinese characters</h3>
              <FontControl
                label="Font"
                value={config.base.fontFamily}
                options={BASE_FONT_OPTIONS}
                onChange={(fontFamily) => setBase({ fontFamily })}
              />
              <RangeControl
                label="Size"
                value={config.base.fontSize}
                min={1}
                max={4}
                step={0.05}
                unit="rem"
                onChange={(fontSize) => setBase({ fontSize })}
              />
              <SelectControl
                label="Weight"
                value={String(config.base.fontWeight)}
                options={FONT_WEIGHTS.map((w) => ({
                  value: String(w),
                  label: String(w),
                }))}
                onChange={(w) => setBase({ fontWeight: Number(w) })}
              />
              <ColorControl
                label="Color"
                value={config.base.color}
                onChange={(color) => setBase({ color })}
              />
              <RangeControl
                label="Letter spacing"
                value={config.base.letterSpacing}
                min={-0.05}
                max={0.2}
                step={0.005}
                unit="em"
                onChange={(letterSpacing) => setBase({ letterSpacing })}
              />
              <RangeControl
                label="Line height"
                value={config.base.lineHeight}
                min={1.5}
                max={3.5}
                step={0.05}
                unit=""
                onChange={(lineHeight) => setBase({ lineHeight })}
              />
            </div>

            <div className="style-col">
              <h3 className="style-col-title">Jyutping ruby</h3>
              <FontControl
                label="Font"
                value={config.ruby.fontFamily}
                options={RUBY_FONT_OPTIONS}
                onChange={(fontFamily) => setRuby({ fontFamily })}
              />
              <RangeControl
                label="Size (relative)"
                value={config.ruby.fontSizeEm}
                min={0.2}
                max={0.6}
                step={0.01}
                unit="em"
                onChange={(fontSizeEm) => setRuby({ fontSizeEm })}
              />
              <SelectControl
                label="Weight"
                value={String(config.ruby.fontWeight)}
                options={FONT_WEIGHTS.map((w) => ({
                  value: String(w),
                  label: String(w),
                }))}
                onChange={(w) => setRuby({ fontWeight: Number(w) })}
              />
              <ColorControl
                label="Color"
                value={config.ruby.color}
                onChange={(color) => setRuby({ color })}
              />
              <RangeControl
                label="Letter spacing"
                value={config.ruby.letterSpacing}
                min={-0.02}
                max={0.1}
                step={0.005}
                unit="em"
                onChange={(letterSpacing) => setRuby({ letterSpacing })}
              />
              <RangeControl
                label="Gap"
                value={config.ruby.gapEm}
                min={0}
                max={0.4}
                step={0.01}
                unit="em"
                onChange={(gapEm) => setRuby({ gapEm })}
              />
            </div>
          </div>

          <div className="style-row">
            <div className="style-control">
              <span className="style-control-label">Ruby position</span>
              <div
                className="segmented"
                role="radiogroup"
                aria-label="Ruby position"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={config.position === 'over'}
                  className={config.position === 'over' ? 'active' : ''}
                  onClick={() => onChange({ ...config, position: 'over' })}
                >
                  Over
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={config.position === 'under'}
                  className={config.position === 'under' ? 'active' : ''}
                  onClick={() => onChange({ ...config, position: 'under' })}
                >
                  Under
                </button>
              </div>
            </div>

            <div className="style-control style-control-grow">
              <SelectControl
                label="Alignment"
                value={config.align}
                options={ALIGN_MODES.map((m) => ({
                  value: m,
                  label: ALIGN_MODE_INFO[m].label,
                }))}
                onChange={(align) =>
                  onChange({ ...config, align: align as RubyAlignMode })
                }
              />
              <p className="style-caption">{ALIGN_MODE_INFO[config.align].caption}</p>
            </div>

            {columnar && (
              <RangeControl
                label="Column width"
                value={config.columnWidthCh}
                min={1}
                max={6}
                step={0.1}
                unit="ch"
                onChange={(columnWidthCh) =>
                  onChange({ ...config, columnWidthCh })
                }
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}
