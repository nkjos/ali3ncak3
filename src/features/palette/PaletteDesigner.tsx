// Palette designer screen (mounted inside the admin portal's Palette tab).
//
// Flow: pick a base color on the wheel (+ lightness slider + hex input, all
// in sync), read the determined text color / default mode, optionally force
// neutral accents, then compare every palette style side by side via live
// miniature site previews and Apply one to publish it as the site theme.

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react'
import type { Hsl, PaletteStyle } from '../../lib/color'
import {
  PALETTE_STYLES,
  bestTextOn,
  buildSiteTheme,
  contrastRatio,
  detectModeForBase,
  hexToHsl,
  hslToHex,
} from '../../lib/color'
import {
  getPaletteWorkspace,
  getSiteTheme,
  saveModePreference,
  savePaletteWorkspace,
  saveSiteTheme,
  useLayout,
  usePaletteWorkspace,
  useSiteThemeValue,
} from '../../content/store'
import { DEFAULT_THEME } from '../../theme/defaultTheme'
import ColorWheel from './ColorWheel'
import StyleCard from './StyleCard'
import './palette.css'

function safeHsl(hex: string | null | undefined): Hsl | null {
  if (!hex) return null
  try {
    return hexToHsl(hex)
  } catch {
    return null
  }
}

/** Complete-looking hex ('#rrggbb' or 'rrggbb') — safe to commit while typing. */
const FULL_HEX_RE = /^#?[0-9a-fA-F]{6}$/

export default function PaletteDesigner() {
  // Canonical pick state is HSL (hex round-trips can drift the hue while the
  // knob is being dragged). Prefill from the workspace, then the applied
  // theme, then the hand-tuned default.
  const [hsl, setHsl] = useState<Hsl>(
    () =>
      safeHsl(getPaletteWorkspace().lastPickHex) ??
      safeHsl(getSiteTheme()?.baseHex) ??
      hexToHsl(DEFAULT_THEME.baseHex),
  )
  const [neutralAccent, setNeutralAccent] = useState<boolean>(
    () => getSiteTheme()?.neutralAccent ?? false,
  )

  const hex = useMemo(() => hslToHex(hsl), [hsl])

  const workspace = usePaletteWorkspace()
  const appliedTheme = useSiteThemeValue()
  const homeLayout = useLayout('home')
  const sectionTypes = useMemo(
    () => homeLayout.sections.filter((s) => s.enabled).map((s) => s.type),
    [homeLayout],
  )

  // Persist the pick as the user works (debounced so wheel drags don't spam
  // storage), fulfilling "routing back prefills wheel/slider/hex".
  const persistTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      const ws = getPaletteWorkspace()
      if (ws.lastPickHex !== hex) savePaletteWorkspace({ ...ws, lastPickHex: hex })
    }, 250)
    return () => window.clearTimeout(persistTimer.current)
  }, [hex])

  // Hex input: free-typing draft that follows the canonical hex while the
  // field is not focused.
  const [hexDraft, setHexDraft] = useState(hex)
  const hexFocusRef = useRef(false)
  useEffect(() => {
    if (!hexFocusRef.current) setHexDraft(hex)
  }, [hex])
  const hexDraftValid = safeHsl(hexDraft) !== null

  const onHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHexDraft(value)
    if (FULL_HEX_RE.test(value.trim())) {
      const parsed = safeHsl(value)
      if (parsed) setHsl(parsed)
    }
  }

  const onHexFocus = () => {
    hexFocusRef.current = true
  }

  const onHexBlur = (e: FocusEvent<HTMLInputElement>) => {
    hexFocusRef.current = false
    const parsed = safeHsl(e.target.value)
    if (parsed) {
      setHsl(parsed)
      setHexDraft(hslToHex(parsed))
    } else {
      setHexDraft(hex)
    }
  }

  const onHexKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  // Determined facts for the current pick.
  const textOn = bestTextOn(hex)
  const defaultMode = detectModeForBase(hex)
  const textRatio = contrastRatio(hex, textOn)

  // One built theme per palette style, all from the same base + accent flag.
  const themes = useMemo(
    () => PALETTE_STYLES.map((def) => buildSiteTheme(hex, def.id, neutralAccent)),
    [hex, neutralAccent],
  )

  // Which card (if any) exactly matches the live site theme.
  const appliedStyleId: PaletteStyle | null = useMemo(() => {
    if (!appliedTheme) return null
    if (appliedTheme.baseHex.toLowerCase() !== hex.toLowerCase()) return null
    if (appliedTheme.neutralAccent !== neutralAccent) return null
    return appliedTheme.style
  }, [appliedTheme, hex, neutralAccent])

  const applyStyle = (style: PaletteStyle) => {
    const theme = buildSiteTheme(hex, style, neutralAccent)
    saveSiteTheme(theme)
    saveModePreference(theme.defaultMode)
    const ws = getPaletteWorkspace()
    const lower = theme.baseHex.toLowerCase()
    savePaletteWorkspace({
      lastPickHex: theme.baseHex,
      history: [theme.baseHex, ...ws.history.filter((c) => c.toLowerCase() !== lower)],
    })
  }

  // Recent colors: click selects, Shift+click asks to delete.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const historyListRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const onHistorySwatch = (e: ReactMouseEvent<HTMLButtonElement>, color: string) => {
    if (e.shiftKey) {
      restoreFocusRef.current = e.currentTarget
      setPendingDelete(color)
      return
    }
    const parsed = safeHsl(color)
    if (parsed) setHsl(parsed)
  }

  // Close the dialog and put focus back where it came from; after a confirmed
  // delete the swatch is gone, so fall back to the history list container.
  const closeDialog = () => {
    setPendingDelete(null)
    const target = restoreFocusRef.current
    restoreFocusRef.current = null
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus()
      else historyListRef.current?.focus()
    })
  }

  const confirmDelete = () => {
    if (pendingDelete === null) return
    const ws = getPaletteWorkspace()
    savePaletteWorkspace({
      ...ws,
      history: ws.history.filter((c) => c !== pendingDelete),
    })
    closeDialog()
  }

  useEffect(() => {
    if (pendingDelete === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog()
        return
      }
      if (e.key === 'Tab') {
        const modal = modalRef.current
        const focusables = modal?.querySelectorAll<HTMLElement>('button')
        if (!modal || !focusables || focusables.length === 0) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDelete])

  const midHex = hslToHex({ h: hsl.h, s: hsl.s, l: 50 })

  return (
    <div className="pd">
      <header className="pd-header">
        <h2>Palette designer</h2>
        <p>
          Pick a base color, compare every harmony as a live mini-site, and apply
          one to publish it as the storefront theme.
        </p>
      </header>

      <section className="pd-picker" aria-label="Base color picker">
        <ColorWheel
          hue={hsl.h}
          sat={hsl.s}
          knobColor={hex}
          onChange={(h, s) => setHsl((prev) => ({ h, s, l: prev.l }))}
        />

        <div className="pd-controls">
          <div className="pd-current">
            <span className="pd-current-swatch" style={{ background: hex, color: textOn }}>
              Aa
            </span>
            <div className="pd-current-meta">
              <code className="pd-current-hex">{hex}</code>
              <span className="pd-current-hsl">
                H {Math.round(hsl.h)}&deg; &middot; S {Math.round(hsl.s)}% &middot; L{' '}
                {Math.round(hsl.l)}%
              </span>
            </div>
          </div>

          <label className="pd-field">
            <span className="pd-field-label">Hex</span>
            <input
              className={'pd-hex-input' + (hexDraftValid ? '' : ' is-invalid')}
              type="text"
              value={hexDraft}
              onChange={onHexChange}
              onFocus={onHexFocus}
              onBlur={onHexBlur}
              onKeyDown={onHexKeyDown}
              spellCheck={false}
              autoComplete="off"
              inputMode="text"
              aria-label="Hex color"
              aria-invalid={!hexDraftValid}
            />
          </label>

          <label className="pd-field">
            <span className="pd-field-label">
              Lightness <span className="pd-field-value">{Math.round(hsl.l)}%</span>
            </span>
            <input
              className="pd-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(hsl.l)}
              onChange={(e) =>
                setHsl((prev) => ({ ...prev, l: Number(e.target.value) }))
              }
              aria-label="Lightness"
              style={{
                background: `linear-gradient(to right, #000000, ${midHex}, #ffffff)`,
              }}
            />
          </label>

          <dl className="pd-facts">
            <div className="pd-fact">
              <dt>Text on this color</dt>
              <dd>
                <span
                  className="pd-fact-dot"
                  style={{ background: textOn }}
                  aria-hidden="true"
                />
                {textOn === '#ffffff' ? 'White' : 'Black'}
                <span className="pd-fact-sub">{textRatio.toFixed(1)}:1</span>
              </dd>
            </div>
            <div className="pd-fact">
              <dt>Default site mode</dt>
              <dd>
                <span
                  className="pd-fact-dot"
                  style={{ background: defaultMode === 'dark' ? '#101018' : '#ffffff' }}
                  aria-hidden="true"
                />
                {defaultMode === 'dark' ? 'Dark' : 'Light'}
              </dd>
            </div>
          </dl>

          <label className="pd-toggle">
            <input
              type="checkbox"
              checked={neutralAccent}
              onChange={(e) => setNeutralAccent(e.target.checked)}
            />
            <span className="pd-toggle-track" aria-hidden="true">
              <span className="pd-toggle-thumb" />
            </span>
            <span className="pd-toggle-text">
              Use black/white for accent color
              <small>CTA buttons use the mode neutral instead of a palette color.</small>
            </span>
          </label>

          <div className="pd-history">
            <div className="pd-history-head">
              <h3>Recent colors</h3>
              <span className="pd-history-hint">
                Click to select &middot; Shift+click to delete
              </span>
            </div>
            {workspace.history.length === 0 ? (
              <p className="pd-history-empty">Colors you apply will appear here.</p>
            ) : (
              <div className="pd-history-list" ref={historyListRef} tabIndex={-1}>
                {workspace.history.map((color, i) => (
                  <button
                    key={`${color}-${i}`}
                    type="button"
                    className={
                      'pd-history-swatch' +
                      (color.toLowerCase() === hex.toLowerCase() ? ' is-current' : '')
                    }
                    style={{ background: color }}
                    title={color}
                    aria-label={`Select ${color}`}
                    onClick={(e) => onHistorySwatch(e, color)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="pd-styles" aria-label="Palette styles">
        <header className="pd-styles-head">
          <h2>Palette styles</h2>
          <p>
            Every style built from <code>{hex}</code>. Previews follow the current
            Home layout order.
          </p>
        </header>
        <div className="pd-cards">
          {PALETTE_STYLES.map((def, i) => (
            <StyleCard
              key={def.id}
              def={def}
              theme={themes[i]}
              applied={appliedStyleId === def.id}
              sectionTypes={sectionTypes}
              onApply={() => applyStyle(def.id)}
            />
          ))}
        </div>
      </section>

      {pendingDelete !== null && (
        <div
          className="pd-modal-backdrop"
          onClick={closeDialog}
          role="presentation"
        >
          <div
            ref={modalRef}
            className="pd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="pd-modal-swatch"
              style={{ background: pendingDelete }}
              aria-hidden="true"
            />
            <h3 id="pd-modal-title">Delete color?</h3>
            <p>Are you sure you wish to delete this color from history?</p>
            <code className="pd-modal-hex">{pendingDelete}</code>
            <div className="pd-modal-actions">
              <button
                type="button"
                className="pd-btn"
                onClick={closeDialog}
                autoFocus
              >
                Cancel
              </button>
              <button type="button" className="pd-btn pd-btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
