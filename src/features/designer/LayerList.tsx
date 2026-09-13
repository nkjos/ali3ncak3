// Layer list: topmost layer first, mirroring the visual stacking (the stage
// paints the layers array bottom -> top, so this renders it reversed).
// Rows are buttons for keyboard selection; the selected row is marked with
// aria-current. Move up/down re-orders z; delete removes the layer.

import type { DesignLayer } from './transform'
import { useTintedSrc } from './images'

interface LayerListProps {
  /** Paint order: bottom -> top (same array the stage renders). */
  layers: DesignLayer[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Toward the top of the stack. */
  onRaise: (id: string) => void
  /** Toward the bottom of the stack. */
  onLower: (id: string) => void
  onDelete: (id: string) => void
}

function LayerThumb({ layer }: { layer: DesignLayer }) {
  const src = useTintedSrc(layer.src, layer.tint)
  return <img className="dz-thumb dz-checker" src={src} alt="" />
}

export default function LayerList({
  layers,
  selectedId,
  onSelect,
  onRaise,
  onLower,
  onDelete,
}: LayerListProps) {
  if (layers.length === 0) {
    return <p className="dz-side-empty">No layers yet.</p>
  }
  const topFirst = [...layers].reverse()
  return (
    <ul className="dz-layers">
      {topFirst.map((layer, i) => (
        <li key={layer.id} className="dz-layer-row">
          <button
            type="button"
            className="dz-layer-pick"
            aria-current={layer.id === selectedId ? 'true' : undefined}
            onClick={() => onSelect(layer.id)}
          >
            <LayerThumb layer={layer} />
            <span className="dz-layer-name">{layer.name}</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-icon-btn"
            aria-label={`Move ${layer.name} up`}
            disabled={i === 0}
            onClick={() => onRaise(layer.id)}
          >
            &#8593;
          </button>
          <button
            type="button"
            className="admin-btn admin-icon-btn"
            aria-label={`Move ${layer.name} down`}
            disabled={i === topFirst.length - 1}
            onClick={() => onLower(layer.id)}
          >
            &#8595;
          </button>
          <button
            type="button"
            className="admin-btn admin-icon-btn admin-btn-danger"
            aria-label={`Delete ${layer.name}`}
            onClick={() => onDelete(layer.id)}
          >
            &#10005;
          </button>
        </li>
      ))}
    </ul>
  )
}
