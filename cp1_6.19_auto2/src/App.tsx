import { useCallback, useState } from 'react'
import EditorPanel from './components/EditorPanel'
import PreviewPanel from './components/PreviewPanel'
import PresetGallery from './components/PresetGallery'
import CollectionManager from './components/CollectionManager'
import {
  cloneConfig,
  createDefaultGradient,
  type GradientConfig,
  type PresetGradient,
} from './utils/gradientUtils'

export default function App() {
  const [config, setConfig] = useState<GradientConfig>(createDefaultGradient)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  const handleEditorChange = useCallback((next: GradientConfig) => {
    setConfig(next)
    setActivePresetId(null)
  }, [])

  const handlePresetSelect = useCallback((preset: PresetGradient) => {
    setConfig(cloneConfig(preset.config))
    setActivePresetId(preset.id)
  }, [])

  const handleApply = useCallback((next: GradientConfig) => {
    setConfig(next)
    setActivePresetId(null)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div className="brand-text">
            <h1>Gradient Forge</h1>
            <span className="brand-sub">CSS 渐变构建器</span>
          </div>
        </div>
        <p className="tagline">所见即所得 · 一键复制 · 本地收藏</p>
      </header>

      <main className="layout">
        <aside className="layout-side">
          <EditorPanel config={config} onChange={handleEditorChange} />
        </aside>

        <section className="layout-main">
          <PreviewPanel config={config} />
          <PresetGallery onSelect={handlePresetSelect} activeId={activePresetId} />
          <CollectionManager currentConfig={config} onApply={handleApply} />
        </section>
      </main>

      <footer className="app-footer">
        <span>Gradient Forge · 使用 React 18 + TypeScript + Vite 构建</span>
      </footer>
    </div>
  )
}
