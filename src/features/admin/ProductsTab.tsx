// Products tab: full stock management. Edits are held in a local draft and
// published with saveProducts on Save. Price is edited in dollars and stored
// as integer cents; free-typing is buffered per-field so intermediate values
// like "12." never corrupt the draft.

import { useState } from 'react'
import type { Product } from '../../content/types'
import { saveProducts, useProducts } from '../../content/store'
import SaveBar from './SaveBar'

function freshId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `p-${rand}`
}

function dollars(priceCents: number): string {
  return (priceCents / 100).toFixed(2)
}

export default function ProductsTab() {
  const live = useProducts()
  const [draft, setDraft] = useState<Product[] | null>(null)
  // Raw text buffers keyed by product id, cleared on blur/save/discard.
  const [priceText, setPriceText] = useState<Record<string, string>>({})
  const [stockText, setStockText] = useState<Record<string, string>>({})

  const products = draft ?? live
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(live)

  const patch = (id: string, changes: Partial<Product>) =>
    setDraft((prev) =>
      (prev ?? live).map((p) => (p.id === id ? { ...p, ...changes } : p)),
    )

  const onPriceChange = (id: string, text: string) => {
    setPriceText((m) => ({ ...m, [id]: text }))
    const parsed = Number.parseFloat(text)
    if (Number.isFinite(parsed) && parsed >= 0) {
      patch(id, { priceCents: Math.round(parsed * 100) })
    }
  }

  const onPriceBlur = (id: string) =>
    setPriceText((m) => {
      const next = { ...m }
      delete next[id]
      return next
    })

  const onStockChange = (id: string, text: string) => {
    setStockText((m) => ({ ...m, [id]: text }))
    const parsed = Number.parseInt(text, 10)
    if (Number.isFinite(parsed) && parsed >= 0) {
      patch(id, { stock: parsed })
    }
  }

  const onStockBlur = (id: string) =>
    setStockText((m) => {
      const next = { ...m }
      delete next[id]
      return next
    })

  const addProduct = () =>
    setDraft([
      ...(draft ?? live),
      {
        id: freshId(),
        title: 'New product',
        description: '',
        priceCents: 0,
        stock: 0,
        published: false,
        promoted: false,
      },
    ])

  const removeProduct = (product: Product) => {
    const name = product.title.trim() || 'this product'
    if (!window.confirm(`Delete "${name}"? Saving makes this permanent.`)) return
    setDraft((draft ?? live).filter((p) => p.id !== product.id))
  }

  const resetBuffers = () => {
    setPriceText({})
    setStockText({})
  }

  const save = () => {
    if (draft) saveProducts(draft)
    setDraft(null)
    resetBuffers()
  }

  const discard = () => {
    setDraft(null)
    resetBuffers()
  }

  return (
    <section className="admin-tab-body">
      <div className="admin-toolbar">
        <button type="button" className="admin-btn" onClick={addProduct}>
          + Add product
        </button>
        <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
      </div>

      <div className="admin-products">
        {products.map((p) => (
          <article key={p.id} className="admin-card admin-product">
            <label className="admin-field">
              <span>Title</span>
              <input
                className="admin-input"
                value={p.title}
                onChange={(e) => patch(p.id, { title: e.target.value })}
              />
            </label>

            <div className="admin-field-pair">
              <label className="admin-field">
                <span>Price ($)</span>
                <input
                  className="admin-input"
                  inputMode="decimal"
                  value={priceText[p.id] ?? dollars(p.priceCents)}
                  onChange={(e) => onPriceChange(p.id, e.target.value)}
                  onBlur={() => onPriceBlur(p.id)}
                />
              </label>
              <label className="admin-field">
                <span>Stock</span>
                <input
                  className="admin-input"
                  inputMode="numeric"
                  value={stockText[p.id] ?? String(p.stock)}
                  onChange={(e) => onStockChange(p.id, e.target.value)}
                  onBlur={() => onStockBlur(p.id)}
                />
              </label>
            </div>

            <label className="admin-field">
              <span>Description</span>
              <textarea
                className="admin-textarea"
                rows={2}
                value={p.description}
                onChange={(e) => patch(p.id, { description: e.target.value })}
              />
            </label>

            <div className="admin-product-flags">
              <label className="admin-switch-label">
                <input
                  type="checkbox"
                  className="admin-switch"
                  checked={p.published}
                  onChange={(e) => patch(p.id, { published: e.target.checked })}
                />
                <span>Published</span>
              </label>
              <label className="admin-switch-label">
                <input
                  type="checkbox"
                  className="admin-switch"
                  checked={p.promoted}
                  onChange={(e) => patch(p.id, { promoted: e.target.checked })}
                />
                <span>Promoted</span>
              </label>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => removeProduct(p)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {products.length === 0 && (
          <p className="admin-empty">No products yet — add one above.</p>
        )}
      </div>
    </section>
  )
}
