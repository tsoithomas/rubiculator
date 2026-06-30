import { Fragment, useMemo, useState } from 'react'
import { convert, tokensToHtmlString, type Token } from './lib/convert'

const EXAMPLE_CHINESE = '你行得上台，唔好怯呀。'
const EXAMPLE_JYUTPING = 'nei5 haang4 dak1 soeng5 toi4, m4 hou2 hip3 aa3.'

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

export default function App() {
  const [chinese, setChinese] = useState(EXAMPLE_CHINESE)
  const [jyutping, setJyutping] = useState(EXAMPLE_JYUTPING)
  const [copied, setCopied] = useState(false)

  const { tokens, hanCount, syllableCount } = useMemo(
    () => convert(chinese, jyutping),
    [chinese, jyutping],
  )

  const html = useMemo(() => tokensToHtmlString(tokens), [tokens])
  const mismatch = hanCount !== syllableCount

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html)
    } catch {
      // Fallback for environments without the async clipboard API.
      const ta = document.createElement('textarea')
      ta.value = html
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
    <div className="app">
      <header className="masthead">
        <div className="wordmark">
          <span className="seal" aria-hidden="true">粵</span>
          <div className="wordmark-text">
            <h1>Rubiculator</h1>
            <p className="subtitle">Cantonese jyutping ruby typesetting</p>
          </div>
        </div>
      </header>

      <section className="inputs">
        <div className="field">
          <div className="field-head">
            <label htmlFor="chinese-input">Chinese characters</label>
            <span className="counter">
              {hanCount} 字
            </span>
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
          <button
            type="button"
            className={`copy-btn${copied ? ' is-copied' : ''}`}
            onClick={handleCopy}
            disabled={!html}
            aria-label={copied ? 'Copied to clipboard' : 'Copy HTML to clipboard'}
            title={copied ? 'Copied' : 'Copy HTML'}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        {html ? (
          <pre className="code">
            <code>{html}</code>
          </pre>
        ) : (
          <div className="empty">The generated markup will appear here.</div>
        )}
      </section>

      <footer className="site-footer">
        Runs entirely in your browser · no data leaves this page
      </footer>
    </div>
  )
}
