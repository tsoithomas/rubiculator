import { Fragment, useMemo, useRef } from 'react'
import { tokensToStyledHtmlString, type Token } from './lib/convert'
import {
  resolveRubyStyle,
  rubyStyleToCssVars,
  type RubyStyleConfig,
} from './lib/rubyStyle'
import { CopyButton } from './CopyButton'

/** Body height (px) bounds for the resizable dock. */
export const DOCK_MIN_HEIGHT = 120
const KEY_STEP = 24
const MAX_HEIGHT_RATIO = 0.7

/** Clamp a requested body height to [min, 70% of the viewport]. */
export function clampDockHeight(h: number): number {
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  return Math.max(DOCK_MIN_HEIGHT, Math.min(h, Math.round(vh * MAX_HEIGHT_RATIO)))
}

/** One base/annotation pair rendered as a <ruby>, optionally wrapped in a
 *  fixed-width column and with the annotation split into per-letter spans. */
function renderPair(
  base: string,
  annotation: string,
  key: number,
  spread: boolean,
) {
  return (
    <ruby key={key}>
      {base}
      {annotation && (
        <>
          <rp>(</rp>
          {spread ? (
            <rt className="rt-spread">
              <span className="rt-row">
                {[...annotation].map((ch, k) => (
                  <span key={k}>{ch}</span>
                ))}
              </span>
            </rt>
          ) : (
            <rt>{annotation}</rt>
          )}
          <rp>)</rp>
        </>
      )}
    </ruby>
  )
}

/** Render the token list as real React nodes for the live preview. */
function renderTokens(tokens: Token[], config: RubyStyleConfig) {
  const columnar = config.align === 'fixed-width' || config.align === 'spread'
  const spread = config.align === 'spread'

  return tokens.map((token, i) => {
    if (token.type === 'text') {
      return <Fragment key={i}>{token.value}</Fragment>
    }
    if (columnar) {
      return (
        <Fragment key={i}>
          {token.pairs.map(({ base, annotation }, j) => (
            <span className="ruby-col" key={j}>
              {renderPair(base, annotation, j, spread)}
            </span>
          ))}
        </Fragment>
      )
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

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      style={{
        transform: up ? 'none' : 'rotate(180deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M4 10l4-4 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Always-visible preview docked to the bottom of the viewport, with a
 *  draggable top-edge resize handle and a minimize/expand toggle. */
export function PreviewDock({
  tokens,
  config,
  emptyMessage,
  minimized,
  onToggleMinimize,
  height,
  onHeightChange,
}: {
  tokens: Token[]
  config: RubyStyleConfig
  emptyMessage: string
  minimized: boolean
  onToggleMinimize: () => void
  height: number
  onHeightChange: (h: number) => void
}) {
  const previewStyle = useMemo(
    () => rubyStyleToCssVars(resolveRubyStyle(config)),
    [config],
  )
  // Copy the same self-contained styled markup that the preview renders.
  const copyHtml = useMemo(
    () => (tokens.length > 0 ? tokensToStyledHtmlString(tokens, config) : ''),
    [tokens, config],
  )

  // Drag state kept in a ref so pointermove doesn't churn React state.
  const drag = useRef<{ startY: number; startH: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startH: height }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    // Dragging up (smaller clientY) makes the dock taller.
    onHeightChange(
      clampDockHeight(drag.current.startH + (drag.current.startY - e.clientY)),
    )
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    drag.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onHeightChange(clampDockHeight(height + KEY_STEP))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onHeightChange(clampDockHeight(height - KEY_STEP))
    }
  }

  return (
    <div className={`preview-dock${minimized ? ' is-minimized' : ''}`}>
      <div className="preview-dock-inner">
        {!minimized && (
          <div
            className="preview-dock-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize preview"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
          />
        )}
        <div className="preview-dock-head">
          <h2>Preview</h2>
          <div className="panel-head-actions">
            <CopyButton text={copyHtml} label="Copy styled HTML" />
            <button
              type="button"
              className="style-toggle preview-dock-toggle"
              aria-expanded={!minimized}
              aria-label={minimized ? 'Expand preview' : 'Minimize preview'}
              onClick={onToggleMinimize}
            >
              <ChevronIcon up={minimized} />
            </button>
          </div>
        </div>
        {!minimized && (
          <div className="preview-dock-body" style={{ height }}>
            {tokens.length > 0 ? (
              <div
                className="preview"
                lang="zh-Hant"
                data-rb-position={config.position}
                style={previewStyle as React.CSSProperties}
              >
                {renderTokens(tokens, config)}
              </div>
            ) : (
              <div className="empty">{emptyMessage}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
