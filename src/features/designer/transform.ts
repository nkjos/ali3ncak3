// Layer transform math — the SINGLE source of truth shared by the on-stage
// CSS rendering and the export canvas drawing. Both consume the same
// LayerTransform, so what you see on the stage is exactly what exports; any
// drift between the two would be a bug, so neither side does its own math.
//
// Convention: a layer's (x, y) is its CENTER in the base image's natural
// pixel space. `outputScale` maps that space onto a target surface — the
// on-screen stage (stage px per base px) or an export canvas (canvas px per
// base px). Rotation is integer degrees, clockwise (CSS rotate() and canvas
// ctx.rotate() agree on this in a y-down coordinate system). Flips are
// folded into the scale signs so the two renderers cannot disagree.

import type { CSSProperties } from 'react'

export interface DesignLayer {
  id: string
  name: string // "Overlay 1", "Drawing 2"
  src: string // data URL (uploaded PNG or drawn canvas export)
  naturalW: number
  naturalH: number
  x: number // layer CENTER, in base-image pixel coordinates
  y: number
  scale: number // uniform
  rotation: number // degrees, INTEGER (1° increments), kept in [0, 360)
  flipH: boolean
  flipV: boolean
  tint: string | null // hex recolor, null = original colors
}

export interface BaseImage {
  src: string
  w: number
  h: number
}

export const MIN_SCALE = 0.02
export const MAX_SCALE = 20

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** Snap to a whole degree and wrap into [0, 360). */
export function normalizeRotation(deg: number): number {
  if (!Number.isFinite(deg)) return 0
  const r = Math.round(deg) % 360
  return r < 0 ? r + 360 : r
}

/** The resolved transform for one layer on a surface `outputScale`× the base. */
export interface LayerTransform {
  /** Layer center on the target surface, in surface px. */
  tx: number
  ty: number
  /** Integer degrees, clockwise. */
  rotation: number
  /** Signed uniform scale (flip folded in), including outputScale. */
  scaleX: number
  scaleY: number
}

export function layerTransform(
  layer: DesignLayer,
  outputScale: number,
): LayerTransform {
  const s = layer.scale * outputScale
  return {
    tx: layer.x * outputScale,
    ty: layer.y * outputScale,
    rotation: layer.rotation,
    scaleX: layer.flipH ? -s : s,
    scaleY: layer.flipV ? -s : s,
  }
}

export function layerCssTransform(t: LayerTransform): string {
  return `translate(-50%, -50%) rotate(${t.rotation}deg) scale(${t.scaleX}, ${t.scaleY})`
}

/**
 * Stage rendering: the <img> is laid out at its NATURAL size with its
 * top-left at (tx, ty); translate(-50%, -50%) (outermost, so unaffected by
 * the rotate/scale that follow) re-centers it there, and rotate/scale act
 * about the element center (the default transform-origin). Net effect: the
 * layer's visual center lands exactly at (tx, ty), rotated then scaled about
 * that center — identical to drawLayerImage below.
 */
export function layerStageStyle(
  layer: DesignLayer,
  stageScale: number,
): CSSProperties {
  const t = layerTransform(layer, stageScale)
  return {
    left: `${t.tx}px`,
    top: `${t.ty}px`,
    width: `${layer.naturalW}px`,
    height: `${layer.naturalH}px`,
    transform: layerCssTransform(t),
  }
}

/**
 * Export rendering: translate to the layer center, rotate, scale with the
 * flip signs, draw the image centered at natural size. Mirrors
 * layerStageStyle exactly (same LayerTransform, same operation order).
 */
export function drawLayerImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  layer: DesignLayer,
  outputScale: number,
): void {
  const t = layerTransform(layer, outputScale)
  ctx.save()
  ctx.translate(t.tx, t.ty)
  ctx.rotate((t.rotation * Math.PI) / 180)
  ctx.scale(t.scaleX, t.scaleY)
  ctx.drawImage(
    image,
    -layer.naturalW / 2,
    -layer.naturalH / 2,
    layer.naturalW,
    layer.naturalH,
  )
  ctx.restore()
}
