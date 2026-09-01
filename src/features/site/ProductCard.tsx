// Shared product card used by the `promoted` and `productGrid` sections.
// Card chrome uses the mode surface tokens (--c-surface / --c-surface-text);
// the image placeholder + CTA pick up the enclosing section's --section-* vars.

import { useEffect, useRef, useState } from 'react'
import type { Product } from '../../content/types'

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false)
  const timerRef = useRef<number | null>(null)
  const outOfStock = product.stock <= 0

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  function handleAdd() {
    // Prototype: no real cart yet — flash confirmation on the button.
    setAdded(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article className="product-card">
      <div className="product-card__img" aria-hidden="true" />
      <div className="product-card__row">
        <h3 className="product-card__title">{product.title}</h3>
        <span className="product-card__price">{formatPrice(product.priceCents)}</span>
      </div>
      <p className="product-card__desc">{product.description}</p>
      <span
        className={`product-card__stock${outOfStock ? ' product-card__stock--out' : ''}`}
      >
        {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
      </span>
      <button
        type="button"
        className="product-card__btn"
        disabled={outOfStock}
        onClick={handleAdd}
      >
        {added ? 'Added to cart!' : 'Add to cart'}
      </button>
    </article>
  )
}
