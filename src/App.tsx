import { Fragment, useMemo, useState } from 'react'
import {
  convert,
  parseRubyHtml,
  tokensToHtmlString,
  type Token,
} from './lib/convert'

type Mode = 'compose' | 'extract'

const EXAMPLE_CHINESE = '你行得上台，唔好怯呀。'
const EXAMPLE_JYUTPING = 'nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3.'
const EXAMPLE_HTML = tokensToHtmlString(
  convert(EXAMPLE_CHINESE, EXAMPLE_JYUTPING).tokens,
)

/** Render the token list as real React nodes for the live preview. */
function renderTokens(tokens: Token[]) {
  return tokens.map((token, i) => {
    if (token.type === 'text') {
      return <Fragment key={i}>{token.value}</Fragment>
    }
    return (
      <ruby key={i}>
        {token.pairs.map(({ base, annotation }, j) => (
          <Fragment key={j}>
            {base}
            {annotation && (
              <>
                <rp>(</rp>
                <rt>{annotation}</rt>
                <rp>)</rp>
              </>
            )}
          </Fragment>
        ))}
      </ruby>
    )
  })
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path
        d="M13.5 4.5 6.5 11.5 2.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <rect
        x="5.5" y="5.5" width="8" height="8" rx="1.5"
        fill="none" stroke="currentColor" strokeWidth="1.5"
      />
      <path
        d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3.5V9A1.5 1.5 0 0 0 4 10.5h1.5"
        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}

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

/** Icon-only copy button that owns its own transient "copied" state. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for environments without the async clipboard API.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      className={`copy-btn${copied ? ' is-copied' : ''}`}
      onClick={handleCopy}
      disabled={!text}
      aria-label={copied ? 'Copied to clipboard' : label}
      title={copied ? 'Copied' : label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

function ComposeView() {
  const [chinese, setChinese] = useState(EXAMPLE_CHINESE)
  const [jyutping, setJyutping] = useState(EXAMPLE_JYUTPING)

  const { tokens, hanCount, syllableCount } = useMemo(
    () => convert(chinese, jyutping),
    [chinese, jyutping],
  )
  const html = useMemo(() => tokensToHtmlString(tokens), [tokens])
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

      <section className="panel preview-panel">
        <div className="panel-head">
          <h2>Preview</h2>
        </div>
        {tokens.length > 0 ? (
          <div className="preview" lang="zh-Hant">
            {renderTokens(tokens)}
          </div>
        ) : (
          <div className="empty">Enter text above to see the preview.</div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>HTML</h2>
          <CopyButton text={html} label="Copy HTML" />
        </div>
        {html ? (
          <pre className="code">
            <code>{html}</code>
          </pre>
        ) : (
          <div className="empty">The generated markup will appear here.</div>
        )}
      </section>
    </>
  )
}

function ExtractView() {
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

      <section className="panel preview-panel">
        <div className="panel-head">
          <h2>Preview</h2>
        </div>
        {previewTokens.length > 0 ? (
          <div className="preview" lang="zh-Hant">
            {renderTokens(previewTokens)}
          </div>
        ) : (
          <div className="empty">Paste ruby HTML above to see the preview.</div>
        )}
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
    </>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('compose')

  return (
    <div className="app">
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

      {mode === 'compose' ? <ComposeView /> : <ExtractView />}

      <footer className="site-footer">
        Runs entirely in your browser · no data leaves this page
      </footer>
    </div>
  )
}
