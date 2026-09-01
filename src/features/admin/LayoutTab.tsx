// Layout tab: per-page section list editor. All edits are held in local
// draft state (per page) and only published to the store on Save.

import { useState } from 'react'
import type { PageId, SectionConfig, SectionType } from '../../content/types'
import { saveLayout, useLayout } from '../../content/store'
import SaveBar from './SaveBar'

const PAGES: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'store', label: 'Store' },
]

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  about: 'About',
  promoted: 'Promoted products',
  misc: 'Misc',
  storeBanner: 'Store banner',
  productGrid: 'Product grid',
}

/** Full add-section catalog; duplicates of a type are allowed. */
const SECTION_CATALOG: SectionType[] = [
  'hero',
  'about',
  'promoted',
  'misc',
  'storeBanner',
  'productGrid',
]

function freshUid(type: SectionType): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${type}-${rand}`
}

export default function LayoutTab() {
  const [page, setPage] = useState<PageId>('home')
  // One draft per page so switching pages never loses unsaved edits.
  const [drafts, setDrafts] = useState<Partial<Record<PageId, SectionConfig[]>>>(
    {},
  )
  const [addType, setAddType] = useState<SectionType>('hero')

  const live = useLayout(page)
  const draft = drafts[page]
  const sections = draft ?? live.sections
  const dirty =
    draft !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(live.sections)

  const setSections = (next: SectionConfig[]) =>
    setDrafts((d) => ({ ...d, [page]: next }))

  const clearDraft = () =>
    setDrafts((d) => {
      const next = { ...d }
      delete next[page]
      return next
    })

  const toggleEnabled = (uid: string) =>
    setSections(
      sections.map((s) => (s.uid === uid ? { ...s, enabled: !s.enabled } : s)),
    )

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setSections(next)
  }

  const removeSection = (uid: string) =>
    setSections(sections.filter((s) => s.uid !== uid))

  const addSection = () =>
    setSections([
      ...sections,
      { uid: freshUid(addType), type: addType, enabled: true },
    ])

  const save = () => {
    saveLayout({ page, sections })
    clearDraft()
  }

  return (
    <section className="admin-tab-body">
      <div className="admin-toolbar">
        <div className="admin-segment" role="group" aria-label="Page">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`admin-segment-btn${page === p.id ? ' is-active' : ''}`}
              aria-pressed={page === p.id}
              onClick={() => setPage(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <SaveBar dirty={dirty} onSave={save} onDiscard={clearDraft} />
      </div>

      <ul className="admin-list">
        {sections.map((s, i) => (
          <li
            key={s.uid}
            className={`admin-row${s.enabled ? '' : ' is-disabled'}`}
          >
            <label className="admin-switch-label">
              <input
                type="checkbox"
                className="admin-switch"
                checked={s.enabled}
                onChange={() => toggleEnabled(s.uid)}
                aria-label={`${SECTION_TYPE_LABELS[s.type]} enabled`}
              />
              <span className="admin-row-name">
                {SECTION_TYPE_LABELS[s.type]}
              </span>
            </label>
            <span className="admin-row-uid">{s.uid}</span>
            <div className="admin-row-actions">
              <button
                type="button"
                className="admin-btn admin-icon-btn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
              >
                &uarr;
              </button>
              <button
                type="button"
                className="admin-btn admin-icon-btn"
                onClick={() => move(i, 1)}
                disabled={i === sections.length - 1}
                aria-label="Move down"
              >
                &darr;
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => removeSection(s.uid)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {sections.length === 0 && (
          <li className="admin-empty">No sections on this page — add one below.</li>
        )}
      </ul>

      <div className="admin-add">
        <label className="admin-label" htmlFor="admin-add-section">
          Add section
        </label>
        <select
          id="admin-add-section"
          className="admin-select"
          value={addType}
          onChange={(e) => setAddType(e.target.value as SectionType)}
        >
          {SECTION_CATALOG.map((t) => (
            <option key={t} value={t}>
              {SECTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button type="button" className="admin-btn" onClick={addSection}>
          Add
        </button>
      </div>

      <p className="admin-note">
        Changes stay local until you press Save, which publishes the layout
        live. Disabled sections are skipped by the color cycle on the site.
      </p>
    </section>
  )
}
