import { useEffect, useState } from 'react'
import { generateGradientCSS, generateGradientCSSRule, type GradientConfig } from '../utils/gradientUtils'

interface PreviewPanelProps {
  config: GradientConfig
}

export default function PreviewPanel({ config }: PreviewPanelProps) {
  const [copied, setCopied] = useState(false)
  const gradientCss = generateGradientCSS(config)
  const cssRule = generateGradientCSSRule(config)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cssRule)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = cssRule
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(textarea)
    }
    setCopied(true)
  }

  return (
    <div className="preview-panel">
      <div className="panel-head">
        <span className="panel-dot" />
        <h2 className="panel-title">实时预览</h2>
      </div>

      <div className="preview-canvas" style={{ background: gradientCss }} />

      <div className="code-block">
        <div className="code-block-head">
          <span className="code-label">CSS</span>
          <button
            type="button"
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyCode}
          >
            {copied ? '已复制 ✓' : '复制代码'}
          </button>
        </div>
        <pre className="code-content">
          <code>{cssRule}</code>
        </pre>
      </div>
    </div>
  )
}
