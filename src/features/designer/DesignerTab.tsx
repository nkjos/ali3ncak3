// Designer tab: admin-only overlay studio for composing product images.
// Layers live in the base image's natural pixel space; the stage is that
// space scaled to fit, so interaction math and export math share one source
// of truth (transform.ts). Mounted by AdminPage as the "Designer" tab.

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { BaseImage, DesignLayer } from './transform'
import { clampScale } from './transform'
import {
  compositeToProductDataUrl,
  downloadComposite,
  loadImage,
  readFileAsDataURL,
  uid,
} from './images'
import Stage from './Stage'
import DrawPanel from './DrawPanel'
import LayerList from './LayerList'
import LayerControls from './LayerControls'
import CreateProductModal from './CreateProductModal'
import './designer.css'

type OverlaySource = 'upload' | 'draw'

export default function DesignerTab() {
  const [base, setBase] = useState<BaseImage | null>(null)
  const [layers, setLayers] = useState<DesignLayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [source, setSource] = useState<OverlaySource>('upload')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'download' | 'product' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const baseInputRef = useRef<HTMLInputElement | null>(null)
  const overlayInputRef = useRef<HTMLInputElement | null>(null)
  const counters = useRef({ overlay: 0, drawing: 0 })
  const successTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (successTimer.current !== null) {
        window.clearTimeout(successTimer.current)
      }
    },
    [],
  )

  const flashSuccess = (message: string) => {
    setSuccess(message)
    if (successTimer.current !== null) window.clearTimeout(successTimer.current)
    successTimer.current = window.setTimeout(() => setSuccess(null), 6000)
  }

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null

  const patchLayer = (id: string, changes: Partial<DesignLayer>) =>
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...changes } : l)),
    )

  const deleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id))
    setSelectedId((sel) => (sel === id ? null : sel))
  }

  // dir +1 raises toward the top of the stack (end of the paint array).
  const moveLayer = (id: string, dir: 1 | -1) =>
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const tmp = next[i]
      next[i] = next[j]
      next[j] = tmp
      return next
    })

  const onBaseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so re-choosing the same file fires change again
    if (!file) return
    setError(null)
    try {
      const src = await readFileAsDataURL(file)
      const img = await loadImage(src)
      // Replacing the base keeps the existing layers (per spec).
      setBase({ src, w: img.naturalWidth, h: img.naturalHeight })
    } catch {
      setError('Could not read that file as an image.')
    }
  }

  const addLayer = (
    src: string,
    w: number,
    h: number,
    kind: 'overlay' | 'drawing',
  ) => {
    if (!base) return
    counters.current[kind] += 1
    const n = counters.current[kind]
    // Land centered, sized to ~60% of the base's smaller side.
    const target = 0.6 * Math.min(base.w, base.h)
    const layer: DesignLayer = {
      id: uid('layer'),
      name: kind === 'overlay' ? `Overlay ${n}` : `Drawing ${n}`,
      src,
      naturalW: w,
      naturalH: h,
      x: base.w / 2,
      y: base.h / 2,
      scale: clampScale(target / Math.max(w, h)),
      rotation: 0,
      flipH: false,
      flipV: false,
      tint: null,
    }
    setLayers((prev) => [...prev, layer])
    setSelectedId(layer.id)
  }

  const onOverlayFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const src = await readFileAsDataURL(file)
      const img = await loadImage(src)
      addLayer(src, img.naturalWidth, img.naturalHeight, 'overlay')
    } catch {
      setError('Could not read that file as an image.')
    }
  }

  const saveToDevice = async () => {
    if (!base || busy !== null) return
    setBusy('download')
    setError(null)
    try {
      await downloadComposite(base, layers)
    } catch {
      setError('Could not render the design. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const openCreateProduct = async () => {
    if (!base || busy !== null) return
    setBusy('product')
    setError(null)
    try {
      setProductImage(await compositeToProductDataUrl(base, layers))
    } catch {
      setError('Could not render the design. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const onCreated = (title: string) => {
    setProductImage(null)
    flashSuccess(
      `Created "${title}" — it's waiting in the Products tab, unpublished.`,
    )
  }

  return (
    <section className="dz-root admin-tab-body">
      <input
        ref={baseInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onBaseFile}
      />
      <input
        ref={overlayInputRef}
        type="file"
        accept="image/png,image/webp"
        hidden
        onChange={onOverlayFile}
      />

      <div className="admin-toolbar">
        <p className="dz-blurb">
          Compose a product image: upload a base photo, stack transparent PNG
          overlays or hand-drawn stickers, then save it or turn it into a
          product.
        </p>
        {base && (
          <div className="dz-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={() => baseInputRef.current?.click()}
            >
              Replace base&hellip;
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={saveToDevice}
              disabled={busy !== null}
            >
              {busy === 'download' ? 'Rendering…' : 'Save to device'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={openCreateProduct}
              disabled={busy !== null}
            >
              {busy === 'product' ? 'Rendering…' : 'Create product…'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="admin-error dz-status" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="admin-success dz-status" role="status">
          {success}
        </p>
      )}

      {!base ? (
        <button
          type="button"
          className="dz-empty-upload"
          onClick={() => baseInputRef.current?.click()}
        >
          <span className="dz-empty-plus" aria-hidden="true">
            +
          </span>
          <strong>Upload a base image to start designing</strong>
          <span className="dz-empty-sub">
            PNG, JPEG, or WebP &mdash; it becomes the canvas your overlays sit
            on.
          </span>
        </button>
      ) : (
        <div className="dz-grid">
          <div className="dz-stage-col">
            <Stage
              base={base}
              layers={layers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onPatch={patchLayer}
            />
            {layers.length === 0 && (
              <p className="dz-hint">
                No overlays yet &mdash; pick an overlay source in the panel and
                upload a transparent PNG or draw a sticker. Click a layer to
                select it, drag to move, corner handles scale, and the top
                handle rotates.
              </p>
            )}
          </div>

          <div className="dz-side">
            <section className="admin-card dz-card" aria-label="Add overlay">
              <h3 className="admin-card-title">Add overlay</h3>
              <label className="admin-field">
                <span>Overlay source</span>
                <select
                  className="admin-select"
                  value={source}
                  onChange={(e) => setSource(e.target.value as OverlaySource)}
                >
                  <option value="upload">Upload PNG</option>
                  <option value="draw">Draw</option>
                </select>
              </label>
              {source === 'upload' ? (
                <>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => overlayInputRef.current?.click()}
                  >
                    Choose PNG&hellip;
                  </button>
                  <p className="admin-note dz-note">
                    Transparent PNG (or WebP) works best &mdash; it lands
                    centered on the base.
                  </p>
                </>
              ) : (
                <DrawPanel
                  onApply={(dataUrl, w, h) => addLayer(dataUrl, w, h, 'drawing')}
                />
              )}
            </section>

            <section className="admin-card dz-card" aria-label="Layers">
              <h3 className="admin-card-title">Layers</h3>
              <LayerList
                layers={layers}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRaise={(id) => moveLayer(id, 1)}
                onLower={(id) => moveLayer(id, -1)}
                onDelete={deleteLayer}
              />
            </section>

            {selectedLayer && (
              <section
                className="admin-card dz-card"
                aria-label="Selected layer"
              >
                <h3 className="admin-card-title">{selectedLayer.name}</h3>
                <LayerControls
                  key={selectedLayer.id}
                  layer={selectedLayer}
                  onPatch={patchLayer}
                  onDelete={deleteLayer}
                />
              </section>
            )}
          </div>
        </div>
      )}

      {productImage !== null && (
        <CreateProductModal
          imageDataUrl={productImage}
          onClose={() => setProductImage(null)}
          onCreated={onCreated}
        />
      )}
    </section>
  )
}
