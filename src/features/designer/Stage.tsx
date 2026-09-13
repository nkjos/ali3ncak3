// Stage: the base image scaled to fit its column, with layers as absolutely
// positioned <img>s styled by the shared transform helper (transform.ts).
// All gestures — layer drag, corner scale, rotate — use pointer events with
// setPointerCapture so mouse and touch behave identically; touch-action:none
// (designer.css) keeps the page from scrolling mid-gesture.

import { useEffect, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { BaseImage, DesignLayer } from './transform'
import {
  clampScale,
  layerStageStyle,
  layerTransform,
  normalizeRotation,
} from './transform'
import { useTintedSrc } from './images'

const MAX_STAGE_HEIGHT = 520

interface StageProps {
  base: BaseImage
  layers: DesignLayer[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPatch: (id: string, changes: Partial<DesignLayer>) => void
}

interface DragState {
  mode: 'move' | 'scale' | 'rotate'
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startScale: number
  /** Pointer distance from the layer center at grab time (screen px). */
  grabDist: number
  startRotation: number
  /** Pointer angle from the layer center at grab time (degrees). */
  startAngle: number
  /** Layer center in screen (client) coordinates at grab time. */
  centerX: number
  centerY: number
}

interface StageLayerProps {
  layer: DesignLayer
  stageScale: number
  onDown: (e: ReactPointerEvent<HTMLImageElement>, layer: DesignLayer) => void
  onMove: (e: ReactPointerEvent<Element>) => void
  onEnd: (e: ReactPointerEvent<Element>) => void
}

function StageLayer({ layer, stageScale, onDown, onMove, onEnd }: StageLayerProps) {
  const src = useTintedSrc(layer.src, layer.tint)
  return (
    <img
      className="dz-layer"
      src={src}
      alt={layer.name}
      draggable={false}
      style={layerStageStyle(layer, stageScale)}
      onPointerDown={(e) => onDown(e, layer)}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    />
  )
}

export default function Stage({
  base,
  layers,
  selectedId,
  onSelect,
  onPatch,
}: StageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [frameW, setFrameW] = useState(0)

  useEffect(() => {
    const el = frameRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      setFrameW(entries[0]?.contentRect.width ?? 0)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The stage is the base's natural pixel space scaled to fit; every gesture
  // divides by this to land back in base coordinates.
  const stageScale =
    frameW > 0 ? Math.min(frameW / base.w, MAX_STAGE_HEIGHT / base.h) : 0
  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null

  const layerCenterOnScreen = (
    layer: DesignLayer,
  ): { x: number; y: number } | null => {
    const el = stageRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + layer.x * stageScale,
      y: rect.top + layer.y * stageScale,
    }
  }

  const onLayerDown = (
    e: ReactPointerEvent<HTMLImageElement>,
    layer: DesignLayer,
  ) => {
    if (!e.isPrimary) return
    e.stopPropagation()
    onSelect(layer.id)
    stageRef.current?.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      mode: 'move',
      id: layer.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      startScale: layer.scale,
      grabDist: 1,
      startRotation: layer.rotation,
      startAngle: 0,
      centerX: 0,
      centerY: 0,
    }
  }

  const onScaleHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const layer = selectedLayer
    if (!layer || !e.isPrimary) return
    e.stopPropagation()
    const center = layerCenterOnScreen(layer)
    if (!center) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      mode: 'scale',
      id: layer.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      startScale: layer.scale,
      grabDist: Math.max(
        1,
        Math.hypot(e.clientX - center.x, e.clientY - center.y),
      ),
      startRotation: layer.rotation,
      startAngle: 0,
      centerX: center.x,
      centerY: center.y,
    }
  }

  const onRotateHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const layer = selectedLayer
    if (!layer || !e.isPrimary) return
    e.stopPropagation()
    const center = layerCenterOnScreen(layer)
    if (!center) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      mode: 'rotate',
      id: layer.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      startScale: layer.scale,
      grabDist: 1,
      startRotation: layer.rotation,
      startAngle:
        (Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180) /
        Math.PI,
      centerX: center.x,
      centerY: center.y,
    }
  }

  const onDragMove = (e: ReactPointerEvent<Element>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId || stageScale <= 0) return
    if (d.mode === 'move') {
      onPatch(d.id, {
        x: d.startX + (e.clientX - d.startClientX) / stageScale,
        y: d.startY + (e.clientY - d.startClientY) / stageScale,
      })
    } else if (d.mode === 'scale') {
      // Uniform, about the layer center: pointer distance to center relative
      // to the grab distance.
      const dist = Math.hypot(e.clientX - d.centerX, e.clientY - d.centerY)
      onPatch(d.id, { scale: clampScale(d.startScale * (dist / d.grabDist)) })
    } else {
      // atan2 from the layer center in screen coords (stage scale and layer
      // position already folded into centerX/centerY), snapped to 1°.
      const angle =
        (Math.atan2(e.clientY - d.centerY, e.clientX - d.centerX) * 180) /
        Math.PI
      onPatch(d.id, {
        rotation: normalizeRotation(d.startRotation + (angle - d.startAngle)),
      })
    }
  }

  const onDragEnd = (e: ReactPointerEvent<Element>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
  }

  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onSelect(null)
      return
    }
    const layer = selectedLayer
    if (!layer) return
    const step = e.shiftKey ? 10 : 1
    let dx = 0
    let dy = 0
    if (e.key === 'ArrowLeft') dx = -step
    else if (e.key === 'ArrowRight') dx = step
    else if (e.key === 'ArrowUp') dy = -step
    else if (e.key === 'ArrowDown') dy = step
    else return
    e.preventDefault()
    onPatch(layer.id, { x: layer.x + dx, y: layer.y + dy })
  }

  return (
    <div className="dz-stage-frame" ref={frameRef}>
      {stageScale > 0 && (
        <div
          ref={stageRef}
          className="dz-stage dz-checker"
          style={{
            width: `${base.w * stageScale}px`,
            height: `${base.h * stageScale}px`,
          }}
          tabIndex={0}
          role="application"
          aria-label="Design stage. Click a layer to select it. Arrow keys nudge the selected layer one pixel, Shift for ten. Escape deselects."
          onKeyDown={onStageKeyDown}
        >
          {/* Layers are clipped to the base area (like the export canvas)… */}
          <div className="dz-stage-clip" onPointerDown={() => onSelect(null)}>
            <img
              className="dz-base"
              src={base.src}
              alt="Base image"
              draggable={false}
            />
            {layers.map((layer) => (
              <StageLayer
                key={layer.id}
                layer={layer}
                stageScale={stageScale}
                onDown={onLayerDown}
                onMove={onDragMove}
                onEnd={onDragEnd}
              />
            ))}
          </div>

          {/* …while the selection chrome stays unclipped so edge layers keep
              grabbable handles. The outline box rotates but never flips
              (flips do not change the bounding box). */}
          {selectedLayer &&
            (() => {
              const t = layerTransform(selectedLayer, stageScale)
              const w = selectedLayer.naturalW * selectedLayer.scale * stageScale
              const h = selectedLayer.naturalH * selectedLayer.scale * stageScale
              return (
                <div
                  className="dz-select"
                  style={{
                    left: `${t.tx}px`,
                    top: `${t.ty}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    transform: `translate(-50%, -50%) rotate(${selectedLayer.rotation}deg)`,
                  }}
                >
                  <span className="dz-rotate-stem" aria-hidden="true" />
                  <div
                    className="dz-rotate"
                    title="Rotate"
                    aria-hidden="true"
                    onPointerDown={onRotateHandleDown}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onPointerCancel={onDragEnd}
                  />
                  {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                    <div
                      key={corner}
                      className={`dz-handle dz-handle-${corner}`}
                      aria-hidden="true"
                      onPointerDown={onScaleHandleDown}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
                      onPointerCancel={onDragEnd}
                    />
                  ))}
                </div>
              )
            })()}
        </div>
      )}
    </div>
  )
}
