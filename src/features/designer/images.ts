// Image utilities for the Designer tab: file reading, a decoded-image cache,
// tint recoloring (runtime-only cache — the tint lives on the layer, the
// stored src is never mutated), and the composite renderer shared by
// "Save to device" and "Create product…".

import { useEffect, useReducer } from 'react'
import type { BaseImage, DesignLayer } from './transform'
import { drawLayerImage } from './transform'

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${rand}`
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

// ---------------------------------------------------------------------------
// Decoded-image cache (keyed by src; data URLs never taint the canvas)
// ---------------------------------------------------------------------------

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(src)
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => {
        imageCache.delete(src)
        reject(new Error('Image failed to decode'))
      }
      img.src = src
    })
    imageCache.set(src, pending)
  }
  return pending
}

// ---------------------------------------------------------------------------
// Tinting. Recolors while preserving alpha and shading: draw the image, then
// 'color' blend with the tint, then 'destination-in' with the image again to
// restore the original alpha channel. Results are cached per (src, tint) —
// runtime only, nothing is persisted.
// ---------------------------------------------------------------------------

const tintedCache = new Map<string, string>() // src + '|' + tint -> data URL
const tintedPending = new Map<string, Promise<string>>()

function tintKey(src: string, tint: string): string {
  return src + '|' + tint
}

export function tintSrcAsync(src: string, tint: string): Promise<string> {
  const key = tintKey(src, tint)
  const hit = tintedCache.get(key)
  if (hit !== undefined) return Promise.resolve(hit)
  let pending = tintedPending.get(key)
  if (!pending) {
    pending = (async () => {
      const img = await loadImage(src)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, img.naturalWidth)
      canvas.height = Math.max(1, img.naturalHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D unavailable')
      ctx.drawImage(img, 0, 0)
      ctx.globalCompositeOperation = 'color'
      ctx.fillStyle = tint
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(img, 0, 0)
      const url = canvas.toDataURL('image/png')
      tintedCache.set(key, url)
      tintedPending.delete(key)
      return url
    })()
    tintedPending.set(key, pending)
  }
  return pending
}

/**
 * The tinted src for stage/thumbnail <img>s. Returns the original src while
 * the (cached, async) tint renders, then re-renders with the tinted one.
 */
export function useTintedSrc(src: string, tint: string | null): string {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const key = tint === null ? null : tintKey(src, tint)
  useEffect(() => {
    if (key === null || tint === null || tintedCache.has(key)) return
    let alive = true
    tintSrcAsync(src, tint).then(
      () => {
        if (alive) bump()
      },
      () => {
        // Decode failure: keep showing the untinted src.
      },
    )
    return () => {
      alive = false
    }
  }, [key, src, tint])
  if (key === null) return src
  return tintedCache.get(key) ?? src
}

// ---------------------------------------------------------------------------
// Composite export — uses the SAME drawLayerImage math as the stage.
// ---------------------------------------------------------------------------

/**
 * Render base + layers at the base's natural size, scaled down so the
 * longest side is at most `maxSide` (never upscaled).
 */
export async function renderComposite(
  base: BaseImage,
  layers: DesignLayer[],
  maxSide: number,
): Promise<HTMLCanvasElement> {
  const outputScale = Math.min(1, maxSide / Math.max(base.w, base.h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(base.w * outputScale))
  canvas.height = Math.max(1, Math.round(base.h * outputScale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  const baseImg = await loadImage(base.src)
  ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)

  // Array order is paint order (bottom -> top), matching the stage DOM.
  for (const layer of layers) {
    const src =
      layer.tint === null ? layer.src : await tintSrcAsync(layer.src, layer.tint)
    const img = await loadImage(src)
    drawLayerImage(ctx, img, layer, outputScale)
  }
  return canvas
}

/** Composite for a new product: longest side <= 1024, WebP with JPEG fallback. */
export async function compositeToProductDataUrl(
  base: BaseImage,
  layers: DesignLayer[],
): Promise<string> {
  const canvas = await renderComposite(base, layers, 1024)
  const webp = canvas.toDataURL('image/webp', 0.82)
  // Browsers without WebP encoding (e.g. some Safari versions) hand back PNG.
  if (webp.startsWith('data:image/webp')) return webp
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** "Save to device": PNG at natural size capped at 2400 on the longest side. */
export async function downloadComposite(
  base: BaseImage,
  layers: DesignLayer[],
): Promise<void> {
  const canvas = await renderComposite(base, layers, 2400)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('PNG encoding failed')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ali3ncak3-design.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
