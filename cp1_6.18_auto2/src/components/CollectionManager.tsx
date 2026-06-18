import { memo, useEffect, useState } from 'react'
import {
  cloneConfig,
  generateGradientCSS,
  generateId,
  type GradientConfig,
  type SavedGradient,
} from '../utils/gradientUtils'

const STORAGE_KEY = 'gradient_collection'

interface CollectionManagerProps {
  currentConfig: GradientConfig
  onApply: (config: GradientConfig) => void
}

function loadFromStorage(): SavedGradient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SavedGradient[]
  } catch {
    return []
  }
}

function saveToStorage(items: SavedGradient[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore storage errors */
  }
}

function exportGradient(saved: SavedGradient): void {
  const css = `/* 渐变方案: ${saved.name} */\nbackground: ${generateGradientCSS(saved.config)};`
  const blob = new Blob([css], { type: 'text/css' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${saved.name.replace(/\s+/g, '_')}.css`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface CollectionItemProps {
  item: SavedGradient
  onApply: (config: GradientConfig) => void
  onDelete: (id: string) => void
  onExport: (item: SavedGradient) => void
}

const CollectionItem = memo(function CollectionItem({
  item,
  onApply,
  onDelete,
  onExport,
}: CollectionItemProps) {
  return (
    <div className="collection-item">
      <button
        type="button"
        className="collection-thumb"
        style={{ background: generateGradientCSS(item.config) }}
        onClick={() => onApply(cloneConfig(item.config))}
        aria-label={`应用 ${item.name}`}
      />
      <div className="collection-info">
        <span className="collection-name">{item.name}</span>
        <span className="collection-date">
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <div className="collection-actions">
        <button
          type="button"
          className="action-btn edit"
          onClick={() => onApply(cloneConfig(item.config))}
          aria-label="编辑"
        >
          编辑
        </button>
        <button
          type="button"
          className="action-btn export"
          onClick={() => onExport(item)}
          aria-label="导出"
        >
          导出
        </button>
        <button
          type="button"
          className="action-btn delete"
          onClick={() => onDelete(item.id)}
          aria-label="删除"
        >
          删除
        </button>
      </div>
    </div>
  )
})

export default function CollectionManager({ currentConfig, onApply }: CollectionManagerProps) {
  const [items, setItems] = useState<SavedGradient[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    setItems(loadFromStorage())
  }, [])

  const persist = (next: SavedGradient[]) => {
    setItems(next)
    saveToStorage(next)
  }

  const handleSave = () => {
    const trimmed = name.trim() || `渐变方案 ${items.length + 1}`
    const saved: SavedGradient = {
      id: generateId(),
      name: trimmed,
      config: cloneConfig(currentConfig),
      createdAt: Date.now(),
    }
    persist([saved, ...items])
    setName('')
  }

  const handleDelete = (id: string) => {
    persist(items.filter((i) => i.id !== id))
  }

  return (
    <div className="collection-manager">
      <div className="panel-head">
        <span className="panel-dot" />
        <h2 className="panel-title">我的收藏</h2>
        <span className="panel-count">{items.length}</span>
      </div>

      <div className="save-row">
        <input
          type="text"
          className="save-input"
          placeholder="为当前渐变命名..."
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
        <button type="button" className="save-btn" onClick={handleSave}>
          保存
        </button>
      </div>

      {items.length === 0 ? (
        <div className="collection-empty">
          <div className="empty-icon">◈</div>
          <p>还没有收藏的渐变方案</p>
          <span>调整好渐变后，点击「保存」即可收藏</span>
        </div>
      ) : (
        <div className="collection-list">
          {items.map((item) => (
            <CollectionItem
              key={item.id}
              item={item}
              onApply={onApply}
              onDelete={handleDelete}
              onExport={exportGradient}
            />
          ))}
        </div>
      )}
    </div>
  )
}
