// Drawing panel: a transparent 512×512 working canvas. Strokes are stored as
// point arrays + brush props, so undo pops the last stroke and redraws from
// scratch; the eraser paints with destination-out. "Apply to base" exports
// the canvas trimmed to the inked bounding box (alpha-channel scan) plus a
// small padding. Pointer events + setPointerCapture make mouse and touch
// equivalent; touch-action:none (designer.css) stops page scroll while
// drawing.

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const CANVAS_SIZE = 512
const TRIM_PADDING = 8

interface Point {
  x: number
  y: number
}

interface Stroke {
  color: string
  size: number
  erase: boolean
  points: Point[]
}

interface DrawPanelProps {
  onApply: (dataUrl: string, width: number, height: number) => void
}

function applyBrush(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const pts = stroke.points
  if (pts.length === 0) return
  applyBrush(ctx, stroke)
  if (pts.length === 1) {
    // A tap: round-cap lines need two distinct points, so draw a dot.
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function paintSegment(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  from: Point,
  to: Point,
): void {
  applyBrush(ctx, stroke)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
}

interface InkBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Scan the alpha channel for the inked bounding box; null when empty. */
function inkedBounds(canvas: HTMLCanvasElement): InkBounds | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (data[(row + x) * 4 + 3] > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { minX, minY, maxX, maxY }
}

export default function DrawPanel({ onApply }: DrawPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const currentRef = useRef<Stroke | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [color, setColor] = useState('#ff2d95')
  const [size, setSize] = useState(14)
  const [eraser, setEraser] = useState(false)
  const [hasInk, setHasInk] = useState(false)

  // Full redraw (and empty-check) whenever the committed strokes change —
  // this is what makes undo/clear correct.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of strokes) paintStroke(ctx, stroke)
    setHasInk(strokes.length > 0 && inkedBounds(canvas) !== null)
  }, [strokes])

  const toCanvasPoint = (
    e: ReactPointerEvent<HTMLCanvasElement>,
  ): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return
    const ctx = canvasRef.current?.getContext('2d')
    const pt = toCanvasPoint(e)
    if (!ctx || !pt) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const stroke: Stroke = { color, size, erase: eraser, points: [pt] }
    currentRef.current = stroke
    paintStroke(ctx, stroke) // immediate dot feedback
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = currentRef.current
    const ctx = canvasRef.current?.getContext('2d')
    const pt = toCanvasPoint(e)
    if (!stroke || !ctx || !pt) return
    const prev = stroke.points[stroke.points.length - 1]
    stroke.points.push(pt)
    paintSegment(ctx, stroke, prev, pt)
  }

  const onPointerEnd = () => {
    const stroke = currentRef.current
    if (!stroke) return
    currentRef.current = null
    setStrokes((prev) => [...prev, stroke])
  }

  const undo = () => setStrokes((prev) => prev.slice(0, -1))
  const clear = () => setStrokes([])

  const apply = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const bounds = inkedBounds(canvas)
    if (!bounds) return
    const x0 = Math.max(0, bounds.minX - TRIM_PADDING)
    const y0 = Math.max(0, bounds.minY - TRIM_PADDING)
    const x1 = Math.min(canvas.width, bounds.maxX + 1 + TRIM_PADDING)
    const y1 = Math.min(canvas.height, bounds.maxY + 1 + TRIM_PADDING)
    const w = x1 - x0
    const h = y1 - y0
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.drawImage(canvas, x0, y0, w, h, 0, 0, w, h)
    onApply(out.toDataURL('image/png'), w, h)
    setStrokes([]) // fresh canvas for the next sticker
  }

  return (
    <div className="dz-draw">
      <canvas
        ref={canvasRef}
        className="dz-draw-canvas dz-checker"
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        aria-label="Drawing canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />

      <div className="dz-draw-tools">
        <label className="dz-tool">
          <span className="admin-label">Brush color</span>
          <input
            type="color"
            className="dz-color"
            value={color}
            disabled={eraser}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Brush color"
          />
        </label>
        <label className="dz-tool dz-tool-grow">
          <span className="admin-label">Brush size ({size}px)</span>
          <input
            type="range"
            className="dz-range"
            min={1}
            max={64}
            step={1}
            value={size}
            onChange={(e) => setSize(Number.parseInt(e.target.value, 10))}
            aria-label="Brush size in pixels"
          />
        </label>
        <label className="admin-switch-label">
          <input
            type="checkbox"
            className="admin-switch"
            checked={eraser}
            onChange={(e) => setEraser(e.target.checked)}
          />
          <span>Eraser</span>
        </label>
      </div>

      <div className="dz-draw-actions">
        <button
          type="button"
          className="admin-btn"
          onClick={undo}
          disabled={strokes.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className="admin-btn"
          onClick={clear}
          disabled={strokes.length === 0}
        >
          Clear
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={apply}
          disabled={!hasInk}
        >
          Apply to base
        </button>
      </div>
    </div>
  )
}
