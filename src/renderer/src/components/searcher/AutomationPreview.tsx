import React, { useMemo } from 'react'
import { FolderInput } from 'lucide-react'
import type { SearchResult } from '../../store/searcherStore'

/** Rows shown per keyword before collapsing into "…and N more". */
const MAX_ROWS_PER_KEYWORD = 50

interface AutomationPreviewProps {
  plan: Record<string, SearchResult[]>
  destRoot: string
  onApply: () => void
  onDiscard: () => void
}

/**
 * Review step for keyword automation: lists exactly what will move where, so the
 * user confirms a concrete plan instead of an open-ended "move every match".
 */
export function AutomationPreview({
  plan,
  destRoot,
  onApply,
  onDiscard
}: AutomationPreviewProps): React.JSX.Element {
  const entries = useMemo(
    () => Object.entries(plan).filter(([, items]) => items.length > 0),
    [plan]
  )
  const total = entries.reduce((sum, [, items]) => sum + items.length, 0)

  if (total === 0) {
    return (
      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-600 space-y-3">
        <p>No matches found for your saved keywords. Nothing will be moved.</p>
        <button className="text-sm font-semibold underline" onClick={onDiscard}>
          Close
        </button>
      </div>
    )
  }

  return (
    <section
      aria-label="Automation preview"
      className="rounded-2xl border border-amber-200 bg-white overflow-hidden"
    >
      <header className="p-5 border-b border-amber-100 bg-amber-50">
        <p className="text-sm font-bold text-amber-900">
          Review before moving: {total} item{total === 1 ? '' : 's'} across {entries.length} keyword
          {entries.length === 1 ? '' : 's'}
        </p>
        <p className="text-xs text-amber-800/80 mt-1 break-all">Destination: {destRoot}</p>
      </header>

      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
        {entries.map(([keyword, items]) => (
          <details key={keyword} className="group">
            <summary className="px-5 py-3 flex items-center justify-between cursor-pointer text-sm hover:bg-gray-50">
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                <FolderInput size={16} className="text-amber-600" />
                {keyword}
              </span>
              <span className="text-gray-500">
                {items.length} item{items.length === 1 ? '' : 's'}
              </span>
            </summary>
            <ul className="px-5 pb-3 space-y-1 text-xs font-mono text-gray-600">
              {items.slice(0, MAX_ROWS_PER_KEYWORD).map((item) => (
                <li key={item.fullPath} className="truncate" title={item.fullPath}>
                  {item.fullPath}
                </li>
              ))}
              {items.length > MAX_ROWS_PER_KEYWORD && (
                <li className="text-gray-400">…and {items.length - MAX_ROWS_PER_KEYWORD} more</li>
              )}
            </ul>
          </details>
        ))}
      </div>

      <footer className="p-5 flex gap-3 justify-end border-t border-gray-100">
        <button
          onClick={onDiscard}
          className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Discard
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-sm font-bold text-white"
        >
          Move {total} item{total === 1 ? '' : 's'}
        </button>
      </footer>
    </section>
  )
}
