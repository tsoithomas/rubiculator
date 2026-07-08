import { useMemo, useState } from 'react'
import {
  convert,
  parseRubyHtml,
  tokensToHtmlString,
  tokensToStyledHtmlString,
} from './lib/convert'
import { DEFAULT_RUBY_STYLE, type RubyStyleConfig } from './lib/rubyStyle'
import { StylePanel } from './StylePanel'
import { PreviewDock, clampDockHeight } from './PreviewDock'
import { CopyButton } from './CopyButton'

type Mode = 'compose' | 'extract'

/** Shared preview-dock UI state, lifted to App so it persists across modes. */
interface DockProps {
  minimized: boolean
  height: number
  onToggleMinimize: () => void
  onHeightChange: (h: number) => void
}

/** Approx. header + gap above the dock body, so page content clears the dock. */
const DOCK_CHROME = 96
const DOCK_COLLAPSED = 60

const EXAMPLE_CHINESE = '你行得上台，唔好怯呀。'
const EXAMPLE_JYUTPING = 'nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3.'
const EXAMPLE_HTML = tokensToHtmlString(
  convert(EXAMPLE_CHINESE, EXAMPLE_JYUTPING).tokens,
)

function WarnIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M8 1.5 15 14H1L8 1.5Z"
        fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
      <path d="M8 6.2v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.9" fill="currentColor" />
    </svg>
  )
}

function ComposeView({
  config,
  dock,
}: {
  config: RubyStyleConfig
  dock: DockProps
}) {
  const [chinese, setChinese] = useState(EXAMPLE_CHINESE)
  const [jyutping, setJyutping] = useState(EXAMPLE_JYUTPING)
  const [htmlMode, setHtmlMode] = useState<'styled' | 'plain'>('styled')

  const { tokens, hanCount, syllableCount } = useMemo(
    () => convert(chinese, jyutping),
    [chinese, jyutping],
  )
  const plainHtml = useMemo(() => tokensToHtmlString(tokens), [tokens])
  const styledHtml = useMemo(
    () => tokensToStyledHtmlString(tokens, config),
    [tokens, config],
  )
  const html = htmlMode === 'styled' ? styledHtml : plainHtml
  const mismatch = hanCount !== syllableCount

  return (
    <>
      <section className="inputs">
        <div className="field">
          <div className="field-head">
            <label htmlFor="chinese-input">Chinese characters</label>
            <span className="counter">{hanCount} 字</span>
          </div>
          <textarea
            id="chinese-input"
            value={chinese}
            onChange={(e) => setChinese(e.target.value)}
            rows={4}
            spellCheck={false}
            lang="zh-Hant"
            placeholder="你行得上台，唔好怯呀。"
          />
        </div>
        <div className="field">
          <div className="field-head">
            <label htmlFor="jyutping-input">Jyutping</label>
            <span className="counter">
              {syllableCount} syllable{syllableCount === 1 ? '' : 's'}
            </span>
          </div>
          <textarea
            id="jyutping-input"
            value={jyutping}
            onChange={(e) => setJyutping(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3."
          />
        </div>
      </section>

      {mismatch && (
        <div className="warning" role="alert">
          <WarnIcon />
          <span>
            {hanCount} Chinese character{hanCount === 1 ? '' : 's'} but{' '}
            {syllableCount} jyutping syllable{syllableCount === 1 ? '' : 's'} —
            alignment may be off.
          </span>
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>HTML</h2>
          <div className="panel-head-actions">
            <div className="segmented segmented-sm" role="tablist" aria-label="HTML output">
              <button
                type="button"
                role="tab"
                aria-selected={htmlMode === 'styled'}
                className={htmlMode === 'styled' ? 'active' : ''}
                onClick={() => setHtmlMode('styled')}
              >
                Styled
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={htmlMode === 'plain'}
                className={htmlMode === 'plain' ? 'active' : ''}
                onClick={() => setHtmlMode('plain')}
              >
                Plain
              </button>
            </div>
            <CopyButton text={html} label="Copy HTML" />
          </div>
        </div>
        {html ? (
          <pre className="code">
            <code>{html}</code>
          </pre>
        ) : (
          <div className="empty">The generated markup will appear here.</div>
        )}
      </section>

      <PreviewDock
        tokens={tokens}
        config={config}
        emptyMessage="Enter text above to see the preview."
        {...dock}
      />
    </>
  )
}

function ExtractView({
  config,
  dock,
}: {
  config: RubyStyleConfig
  dock: DockProps
}) {
  const [htmlInput, setHtmlInput] = useState(EXAMPLE_HTML)

  const { chinese, jyutping, rubyCount } = useMemo(
    () => parseRubyHtml(htmlInput),
    [htmlInput],
  )
  const previewTokens = useMemo(
    () => convert(chinese, jyutping).tokens,
    [chinese, jyutping],
  )
  const hasInput = htmlInput.trim().length > 0

  return (
    <>
      <section className="field">
        <div className="field-head">
          <label htmlFor="html-input">Ruby HTML</label>
          {hasInput && rubyCount === 0 && (
            <span className="counter hint">no &lt;ruby&gt; tags found</span>
          )}
        </div>
        <textarea
          id="html-input"
          value={htmlInput}
          onChange={(e) => setHtmlInput(e.target.value)}
          rows={6}
          spellCheck={false}
          className="mono"
          placeholder="<ruby>你<rt>nei5</rt>…</ruby>"
        />
      </section>

      <div className="outputs">
        <section className="panel">
          <div className="panel-head">
            <h2>Chinese characters</h2>
            <CopyButton text={chinese} label="Copy Chinese" />
          </div>
          {chinese ? (
            <p className="output" lang="zh-Hant">{chinese}</p>
          ) : (
            <div className="empty">—</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Jyutping</h2>
            <CopyButton text={jyutping} label="Copy jyutping" />
          </div>
          {jyutping ? (
            <p className="output">{jyutping}</p>
          ) : (
            <div className="empty">—</div>
          )}
        </section>
      </div>

      <PreviewDock
        tokens={previewTokens}
        config={config}
        emptyMessage="Paste ruby HTML above to see the preview."
        {...dock}
      />
    </>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('compose')
  const [styleConfig, setStyleConfig] = useState<RubyStyleConfig>(
    DEFAULT_RUBY_STYLE,
  )
  const [previewMinimized, setPreviewMinimized] = useState(false)
  const [previewHeight, setPreviewHeight] = useState(240)

  const dock: DockProps = {
    minimized: previewMinimized,
    height: previewHeight,
    onToggleMinimize: () => setPreviewMinimized((v) => !v),
    onHeightChange: (h) => setPreviewHeight(clampDockHeight(h)),
  }

  // Reserve space so the fixed dock never covers the page's own content.
  const appPaddingBottom = previewMinimized
    ? DOCK_COLLAPSED
    : previewHeight + DOCK_CHROME

  return (
    <div className="app" style={{ paddingBottom: appPaddingBottom }}>
      <header className="masthead">
        <div className="wordmark">
          <span className="seal" aria-hidden="true">粵</span>
          <div className="wordmark-text">
            <h1>Rubyculator</h1>
            <p className="subtitle">Cantonese jyutping ruby typesetting</p>
          </div>
        </div>

        <div className="mode-toggle" role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'compose'}
            className={mode === 'compose' ? 'active' : ''}
            onClick={() => setMode('compose')}
          >
            Compose <span className="mode-sub">漢字 → 粵拼</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'extract'}
            className={mode === 'extract' ? 'active' : ''}
            onClick={() => setMode('extract')}
          >
            Extract <span className="mode-sub">粵拼 → 漢字</span>
          </button>
        </div>
      </header>

      <StylePanel config={styleConfig} onChange={setStyleConfig} />

      {mode === 'compose' ? (
        <ComposeView config={styleConfig} dock={dock} />
      ) : (
        <ExtractView config={styleConfig} dock={dock} />
      )}

      <footer className="site-footer">
        Runs entirely in your browser · no data leaves this page
      </footer>
    </div>
  )
}
