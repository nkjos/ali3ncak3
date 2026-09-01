// Interactive hue/saturation color wheel.
//
// Angle = hue (0deg at 3 o'clock, increasing clockwise), radius = saturation.
// The disc is painted once onto a canvas at 50% lightness (the conventional
// wheel rendering); the pick's actual lightness lives in the separate slider.
// The knob is draggable with pointer events, so mouse and touch both work,
// and it is keyboard-accessible (arrows adjust hue/saturation).

import { useEffect, useRef } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

/** Logical canvas resolution; CSS scales the element responsively. */
const WHEEL_PX = 280

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function norm360(h: number): number {
  return ((h % 360) + 360) % 360
}

/**
 * Numeric HSL -> RGB used only for per-pixel canvas painting (the shared
 * engine's hslToHex round-trips through strings, too slow for ~200k pixels).
 * h 0-360, s/l 0-1.
 */
function hslPixel(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) {
    r = c
    g = x
  } else if (hp < 2) {
    r = x
    g = c
  } else if (hp < 3) {
    g = c
    b = x
  } else if (hp < 4) {
    g = x
    b = c
  } else if (hp < 5) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const m = l - c / 2
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

interface ColorWheelProps {
  /** Current hue, 0-360. */
  hue: number
  /** Current saturation, 0-100. */
  sat: number
  /** Hex of the full current pick (with lightness) — fills the knob. */
  knobColor: string
  onChange: (hue: number, sat: number) => void
}

export default function ColorWheel({ hue, sat, knobColor, onChange }: ColorWheelProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef(false)
  const frameRef = useRef(0)

  // Paint the disc once.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const px = Math.round(WHEEL_PX * dpr)
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(px, px)
    const data = img.data
    const R = px / 2
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - R + 0.5
        const dy = y - R + 0.5
        const d = Math.hypot(dx, dy)
        if (d > R) continue // transparent outside the disc
        const h = norm360((Math.atan2(dy, dx) * 180) / Math.PI)
        const s = Math.min(1, d / R)
        const [r, g, b] = hslPixel(h, s, 0.5)
        const i = (y * px + x) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        // Anti-aliased rim.
        data[i + 3] = d > R - 1.5 ? Math.round(clamp((R - d) / 1.5, 0, 1) * 255) : 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const pickAt = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const radius = rect.width / 2
    if (radius <= 0) return
    const dx = clientX - rect.left - radius
    const dy = clientY - rect.top - radius
    const h = norm360((Math.atan2(dy, dx) * 180) / Math.PI)
    const s = clamp(Math.hypot(dx, dy) / radius, 0, 1) * 100
    onChange(h, s)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Capture is a nicety; dragging still works while over the wheel.
    }
    draggingRef.current = true
    pickAt(e.clientX, e.clientY)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => pickAt(clientX, clientY))
  }

  const endDrag = () => {
    draggingRef.current = false
  }

  const onKnobKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2
    let h = hue
    let s = sat
    switch (e.key) {
      case 'ArrowLeft':
        h = norm360(hue - step)
        break
      case 'ArrowRight':
        h = norm360(hue + step)
        break
      case 'ArrowUp':
        s = clamp(sat + step, 0, 100)
        break
      case 'ArrowDown':
        s = clamp(sat - step, 0, 100)
        break
      default:
        return
    }
    e.preventDefault()
    onChange(h, s)
  }

  const angle = (hue * Math.PI) / 180
  const knobRadiusPct = (clamp(sat, 0, 100) / 100) * 50
  const knobLeft = 50 + Math.cos(angle) * knobRadiusPct
  const knobTop = 50 + Math.sin(angle) * knobRadiusPct

  return (
    <div
      ref={wrapRef}
      className="pd-wheel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <canvas ref={canvasRef} className="pd-wheel-canvas" aria-hidden="true" />
      <div
        className="pd-wheel-knob"
        role="slider"
        tabIndex={0}
        aria-label="Hue and saturation"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(norm360(hue)) % 360}
        aria-valuetext={`Hue ${Math.round(norm360(hue)) % 360} degrees, saturation ${Math.round(sat)} percent`}
        onKeyDown={onKnobKeyDown}
        style={{
          left: `${knobLeft}%`,
          top: `${knobTop}%`,
          background: knobColor,
        }}
      />
    </div>
  )
}
