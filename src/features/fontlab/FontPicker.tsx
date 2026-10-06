// Floating font lab panel: pagination dots for every font, prev/next, a
// serif / sans-serif / strange & weird filter, a text-size preset, and the text-editing controls.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CATEGORY_LABELS, LAB_FONTS, applyLabFont, type LabFont } from './fonts'
import { LAB_SIZES, applyLabSize, labSize, sizePercent, type LabSizeId } from './sizes'

type StyleFilter = 'all' | LabFont['category']

const FAMILY_KEY = 'ac3:fontLab:family'
const STYLE_KEY = 'ac3:fontLab:style'
const SIZE_KEY = 'ac3:fontLab:size'

function readPref(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface FontPickerProps {
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onResetText: () => void
}

export function FontPicker({ editing, onEditingChange, onResetText }: FontPickerProps) {
  // Remember the font by family name so reordering the list doesn't change it.
  const [family, setFamily] = useState(() => {
    const saved = readPref(FAMILY_KEY)
    return typeof saved === 'string' ? saved : ''
  })
  const [styleFilter, setStyleFilter] = useState<StyleFilter>(() => {
    const saved = readPref(STYLE_KEY)
    return saved === 'serif' || saved === 'sans-serif' || saved === 'weird' ? saved : 'all'
  })
  const [sizeId, setSizeId] = useState<LabSizeId>(() => labSize(readPref(SIZE_KEY)).id)
  const [isOpen, setIsOpen] = useState(true)
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([])

  const fonts =
    styleFilter === 'all' ? LAB_FONTS : LAB_FONTS.filter((f) => f.category === styleFilter)
  // Index 0 is the site's own font; 1..N are the fonts shown for the style.
  const optionCount = fonts.length + 1
  const savedIndex = fonts.findIndex((f) => f.family === family)
  const index = savedIndex === -1 ? 0 : savedIndex + 1
  const font = index === 0 ? null : fonts[index - 1]
  const size = labSize(sizeId)

  useEffect(() => {
    applyLabFont(font)
  }, [font])

  useEffect(() => {
    applyLabSize(size)
  }, [size])

  // Leaving /font restores the site's own font and sizes.
  useEffect(
    () => () => {
      applyLabFont(null)
      applyLabSize(null)
    },
    [],
  )

  const changeSize = (next: LabSizeId) => {
    setSizeId(next)
    writePref(SIZE_KEY, next)
  }

  const chooseFamily = (next: string) => {
    setFamily(next)
    writePref(FAMILY_KEY, next)
  }

  const select = (next: number, focus = false) => {
    const wrapped = (next + optionCount) % optionCount
    chooseFamily(wrapped === 0 ? '' : fonts[wrapped - 1].family)
    if (focus) dotRefs.current[wrapped]?.focus()
  }

  const changeStyle = (next: StyleFilter) => {
    setStyleFilter(next)
    writePref(STYLE_KEY, next)
    // Keep the page showing a font of the chosen style.
    if (font && next !== 'all' && font.category !== next) {
      const first = LAB_FONTS.find((f) => f.category === next)
      if (first) chooseFamily(first.family)
    }
  }

  const onDotsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: optionCount - 1,
    }
    if (event.key in moves) {
      event.preventDefault()
      select(moves[event.key], true)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="fontlab-reopen"
        onClick={() => setIsOpen(true)}
        title="Show font lab"
      >
        Aa
        <span className="visually-hidden">Show font lab</span>
      </button>
    )
  }

  return (
    <div className="fontlab-panel" role="region" aria-label="Font lab">
      <div className="fontlab-panel__head">
        <button
          type="button"
          className="fontlab-icon-btn"
          onClick={() => select(index - 1)}
          title="Previous font"
        >
          <Chevron direction="left" />
          <span className="visually-hidden">Previous font</span>
        </button>
        <div className="fontlab-panel__title" aria-live="polite">
          <p className="fontlab-panel__name">{font ? font.family : 'Original (site font)'}</p>
          <p className="fontlab-panel__detail">
            {index} / {optionCount - 1}
            {font && ` · ${CATEGORY_LABELS[font.category]} · ${font.note}`}
          </p>
        </div>
        <button
          type="button"
          className="fontlab-icon-btn"
          onClick={() => select(index + 1)}
          title="Next font"
        >
          <Chevron direction="right" />
          <span className="visually-hidden">Next font</span>
        </button>
        <button
          type="button"
          className="fontlab-icon-btn"
          onClick={() => setIsOpen(false)}
          title="Hide font lab"
        >
          <span aria-hidden="true">×</span>
          <span className="visually-hidden">Hide font lab</span>
        </button>
      </div>

      <div className="fontlab-panel__controls">
        <label className="fontlab-field">
          Style
          <select
            value={styleFilter}
            onChange={(event) => changeStyle(event.target.value as StyleFilter)}
          >
            <option value="all">All styles</option>
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="weird">Strange &amp; weird</option>
          </select>
        </label>
        <label className="fontlab-field">
          Size
          <select
            value={sizeId}
            onChange={(event) => changeSize(event.target.value as LabSizeId)}
          >
            {LAB_SIZES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {sizePercent(option)}%
              </option>
            ))}
          </select>
        </label>
        <label className="fontlab-field">
          <input
            type="checkbox"
            checked={editing}
            onChange={(event) => onEditingChange(event.target.checked)}
          />
          Edit text
        </label>
        <button type="button" className="fontlab-text-btn" onClick={onResetText}>
          Reset text
        </button>
      </div>

      <div className="fontlab-dots" role="group" aria-label="Fonts" onKeyDown={onDotsKeyDown}>
        {Array.from({ length: optionCount }, (_, i) => {
          const name = i === 0 ? 'Original (site font)' : fonts[i - 1].family
          return (
            <button
              key={name}
              ref={(el) => {
                dotRefs.current[i] = el
              }}
              type="button"
              className={`fontlab-dot${i === 0 ? ' fontlab-dot--original' : ''}`}
              onClick={() => select(i)}
              title={name}
              aria-label={name}
              aria-pressed={i === index}
            />
          )
        })}
      </div>

      {editing && (
        <p className="fontlab-panel__hint">
          Click any text to edit it. Type <kbd>lorem</kbd>, <kbd>lorem2</kbd> or{' '}
          <kbd>lorem3</kbd> and press <kbd>Tab</kbd> to fill it with placeholder text.
        </p>
      )}
    </div>
  )
}
