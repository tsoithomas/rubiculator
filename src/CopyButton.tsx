import { useState } from 'react'

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

/** Icon-only copy button that owns its own transient "copied" state. */
export function CopyButton({ text, label }: { text: string; label: string }) {
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
