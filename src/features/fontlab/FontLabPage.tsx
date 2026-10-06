// /font — the home page with the font lab overlay: preview Google Fonts
// across the whole page and swap section copy for lorem ipsum to see each
// font with more of the alphabet. Owner tool; nothing here is saved to the
// store, and leaving the page restores the site font.

import { useRef, useState } from 'react'
import { HomePage } from '../site'
import { useEditableText } from './editableText'
import { loremText } from './lorem'
import { FontPicker } from './FontPicker'
import './fontlab.css'

export function FontLabPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(true)
  // Remounting the sections brings back their original text.
  const [resetKey, setResetKey] = useState(0)
  const { suggestion, acceptSuggestion } = useEditableText(contentRef, editing)

  return (
    <>
      <div ref={contentRef} className="fontlab-content">
        <HomePage key={resetKey} />
      </div>

      <FontPicker
        editing={editing}
        onEditingChange={setEditing}
        onResetText={() => setResetKey((key) => key + 1)}
      />

      {suggestion && (
        <button
          type="button"
          className="fontlab-suggestion"
          style={{
            left: Math.max(8, Math.min(suggestion.left, window.innerWidth - 240)),
            top: suggestion.top + 6,
          }}
          // Keep the caret in the text while clicking the suggestion.
          onMouseDown={(event) => event.preventDefault()}
          onClick={acceptSuggestion}
        >
          <kbd>Tab</kbd> {suggestion.keyword} ·{' '}
          {loremText(suggestion.repeats).split(' ').length} words
        </button>
      )}
    </>
  )
}
