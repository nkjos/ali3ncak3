// Controls for the selected layer: integer rotation (input + ±1 steppers),
// uniform scale (number input + slider), flips, tint (kept on the layer,
// separate from src — recoloring is a runtime-only cache), and delete.
// Mount with key={layer.id} so the free-typing buffers reset per selection.

import { useEffect, useRef, useState } from 'react'
import type { DesignLayer } from './transform'
import { MAX_SCALE, MIN_SCALE, clampScale, normalizeRotation } from './transform'

const DEFAULT_TINT = '#ff2d95'
const SLIDER_MAX = 4

interface LayerControlsProps {
  layer: DesignLayer
  onPatch: (id: string, changes: Partial<DesignLayer>) => void
  onDelete: (id: string) => void
}

export default function LayerControls({
  layer,
  onPatch,
  onDelete,
}: LayerControlsProps) {
  // Raw text buffers so intermediate input ("", "-", "0.") never corrupts
  // the layer; cleared on blur (and on selection change via key={layer.id}).
  const [rotText, setRotText] = useState<string | null>(null)
  const [scaleText, setScaleText] = useState<string | null>(null)
  const [tintDraft, setTintDraft] = useState(layer.tint ?? DEFAULT_TINT)

  // The last values THIS control committed. When the layer changes from
  // elsewhere (rotate/scale handle drags, steppers, the slider) the buffers
  // are dropped so the boxes never show a stale number.
  const committedRot = useRef<number | null>(null)
  const committedScale = useRef<number | null>(null)
  useEffect(() => {
    if (rotText !== null && committedRot.current !== layer.rotation) {
      setRotText(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.rotation])
  useEffect(() => {
    if (scaleText !== null && committedScale.current !== layer.scale) {
      setScaleText(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.scale])

  const rotate = (deg: number) =>
    onPatch(layer.id, { rotation: normalizeRotation(deg) })

  const onRotChange = (text: string) => {
    setRotText(text)
    const parsed = Number.parseInt(text, 10)
    if (Number.isFinite(parsed)) {
      committedRot.current = normalizeRotation(parsed)
      rotate(parsed)
    }
  }

  const onScaleChange = (text: string) => {
    setScaleText(text)
    const parsed = Number.parseFloat(text)
    if (Number.isFinite(parsed) && parsed > 0) {
      committedScale.current = clampScale(parsed)
      onPatch(layer.id, { scale: clampScale(parsed) })
    }
  }

  return (
    <div className="dz-controls">
      <div className="dz-row">
        <div className="admin-field dz-grow">
          <span>Rotation (&deg;)</span>
          <span className="dz-stepper">
            <button
              type="button"
              className="admin-btn admin-icon-btn"
              aria-label="Rotate 1 degree counter-clockwise"
              onClick={() => rotate(layer.rotation - 1)}
            >
              &minus;
            </button>
            <input
              className="admin-input dz-num"
              type="number"
              step={1}
              min={0}
              max={359}
              inputMode="numeric"
              value={rotText ?? String(layer.rotation)}
              onChange={(e) => onRotChange(e.target.value)}
              onBlur={() => setRotText(null)}
              aria-label="Rotation in degrees"
            />
            <button
              type="button"
              className="admin-btn admin-icon-btn"
              aria-label="Rotate 1 degree clockwise"
              onClick={() => rotate(layer.rotation + 1)}
            >
              +
            </button>
          </span>
        </div>
        <label className="admin-field dz-grow">
          <span>Scale (&times;)</span>
          <input
            className="admin-input dz-num"
            type="number"
            step={0.05}
            min={MIN_SCALE}
            max={MAX_SCALE}
            inputMode="decimal"
            value={scaleText ?? String(Math.round(layer.scale * 100) / 100)}
            onChange={(e) => onScaleChange(e.target.value)}
            onBlur={() => setScaleText(null)}
            aria-label="Uniform scale factor"
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Scale slider</span>
        <input
          type="range"
          className="dz-range"
          min={MIN_SCALE}
          max={SLIDER_MAX}
          step={0.01}
          value={Math.min(layer.scale, SLIDER_MAX)}
          onChange={(e) =>
            onPatch(layer.id, {
              scale: clampScale(Number.parseFloat(e.target.value)),
            })
          }
          aria-label="Scale slider"
        />
      </label>

      <div className="dz-row dz-row-wrap">
        <label className="admin-switch-label">
          <input
            type="checkbox"
            className="admin-switch"
            checked={layer.flipH}
            onChange={(e) => onPatch(layer.id, { flipH: e.target.checked })}
          />
          <span>Flip horizontal</span>
        </label>
        <label className="admin-switch-label">
          <input
            type="checkbox"
            className="admin-switch"
            checked={layer.flipV}
            onChange={(e) => onPatch(layer.id, { flipV: e.target.checked })}
          />
          <span>Flip vertical</span>
        </label>
      </div>

      <div className="dz-row dz-row-wrap">
        <label className="admin-switch-label">
          <input
            type="checkbox"
            className="admin-switch"
            checked={layer.tint !== null}
            onChange={(e) =>
              onPatch(layer.id, { tint: e.target.checked ? tintDraft : null })
            }
          />
          <span>Tint</span>
        </label>
        <input
          type="color"
          className="dz-color"
          value={layer.tint ?? tintDraft}
          disabled={layer.tint === null}
          aria-label="Tint color"
          onChange={(e) => {
            setTintDraft(e.target.value)
            onPatch(layer.id, { tint: e.target.value })
          }}
        />
        {layer.tint !== null && (
          <button
            type="button"
            className="admin-btn"
            onClick={() => onPatch(layer.id, { tint: null })}
          >
            Clear tint
          </button>
        )}
      </div>

      <div className="dz-row">
        <button
          type="button"
          className="admin-btn admin-btn-danger"
          onClick={() => onDelete(layer.id)}
        >
          Delete layer
        </button>
      </div>
    </div>
  )
}
