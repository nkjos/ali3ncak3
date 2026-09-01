// Shared "unsaved changes" indicator + Save/Discard controls used by the
// Layout and Products tabs (both edit a local draft and publish on Save).

interface SaveBarProps {
  dirty: boolean
  onSave: () => void
  onDiscard: () => void
}

export default function SaveBar({ dirty, onSave, onDiscard }: SaveBarProps) {
  return (
    <div className="admin-savebar">
      {dirty && (
        <span className="admin-dirty">
          <span className="admin-dirty-dot" aria-hidden="true" />
          Unsaved changes
        </span>
      )}
      <button
        type="button"
        className="admin-btn"
        onClick={onDiscard}
        disabled={!dirty}
      >
        Discard
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-primary"
        onClick={onSave}
        disabled={!dirty}
      >
        Save
      </button>
    </div>
  )
}
