// New-product modal for the composited design. Focus-trapped dialog —
// pattern mirrored from PaletteDesigner's delete dialog: Escape closes,
// backdrop click closes, Tab loops inside, and the title input is focused
// on open. Price is entered in dollars and stored as integer cents.

import { useEffect, useRef, useState } from 'react'
import type { Product } from '../../content/types'
import { getProducts, saveProducts } from '../../content/store'
import { uid } from './images'

interface CreateProductModalProps {
  imageDataUrl: string
  onClose: () => void
  onCreated: (title: string) => void
}

export default function CreateProductModal({
  imageDataUrl,
  onClose,
  onCreated,
}: CreateProductModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const modal = modalRef.current
        if (!modal) return
        const focusables = Array.from(
          modal.querySelectorAll<HTMLElement>('button, input, textarea, select'),
        ).filter((el) => !el.hasAttribute('disabled'))
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !modal.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !modal.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Validate as typed: price is dollars (optional cents), stock a whole
  // number; both may be left empty (→ 0). Anything else blocks Create with
  // an inline message instead of being silently coerced to 0.
  const priceClean = price.trim().replace(/^\$/, '')
  const priceValid = priceClean === '' || /^\d+(\.\d{1,2})?$/.test(priceClean)
  const stockClean = stock.trim()
  const stockValid = stockClean === '' || /^\d+$/.test(stockClean)
  const canCreate = title.trim().length > 0 && priceValid && stockValid

  const create = () => {
    if (!canCreate) return
    const priceCents = priceClean === '' ? 0 : Math.round(Number.parseFloat(priceClean) * 100)
    const stockCount = stockClean === '' ? 0 : Number.parseInt(stockClean, 10)
    const product: Product = {
      id: uid('p'),
      title: title.trim(),
      description: description.trim(),
      priceCents,
      stock: stockCount,
      published: false,
      promoted: false,
      imageDataUrl,
    }
    saveProducts([...getProducts(), product])
    onCreated(product.title)
  }

  return (
    <div className="dz-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={modalRef}
        className="dz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dz-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="dz-modal-title" className="dz-modal-title">
          Create product
        </h3>
        <img
          className="dz-modal-preview dz-checker"
          src={imageDataUrl}
          alt="Composited product image preview"
        />

        <label className="admin-field">
          <span>Title</span>
          <input
            ref={titleRef}
            className="admin-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="admin-field-pair">
          <label className="admin-field">
            <span>Price ($)</span>
            <input
              className="admin-input"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={!priceValid}
            />
            {!priceValid && (
              <span className="admin-error dz-field-error">
                Enter dollars like 12 or 12.50
              </span>
            )}
          </label>
          <label className="admin-field">
            <span>Stock</span>
            <input
              className="admin-input"
              inputMode="numeric"
              placeholder="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              aria-invalid={!stockValid}
            />
            {!stockValid && (
              <span className="admin-error dz-field-error">
                Whole number of items
              </span>
            )}
          </label>
        </div>

        <label className="admin-field">
          <span>Description</span>
          <textarea
            className="admin-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <p className="admin-note dz-modal-note">
          The product is created unpublished. Until a real backend exists its
          image lives in this browser&apos;s localStorage, so it only shows up
          on this device.
        </p>

        <div className="dz-modal-actions">
          <button type="button" className="admin-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={create}
            disabled={!canCreate}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
