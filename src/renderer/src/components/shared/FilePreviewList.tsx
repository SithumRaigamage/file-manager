import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface PreviewListItem {
  id: string
  originalName: string
  newName: string
  status?: 'success' | 'failed' | 'skipped' | 'pending' | 'processing' | 'completed' | 'cancelled'
  conflict?: string
  progress?: number
  action?: 'move' | 'copy'
}

interface FilePreviewListProps {
  items: PreviewListItem[]
  rowHeight?: number
}

export function FilePreviewList({ items, rowHeight = 40 }: FilePreviewListProps): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10
  })

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic border rounded-md bg-slate-50">
        No files to preview.
      </div>
    )
  }

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto border rounded-md bg-white w-full shadow-sm"
    >
      <div
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div
              key={virtualRow.index}
              className={`absolute top-0 left-0 w-full px-4 border-b border-slate-100 flex items-center gap-4 text-sm
                ${virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                ${item.conflict ? 'bg-red-50' : ''}
              `}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <div className="flex-1 truncate text-slate-600" title={item.originalName}>
                {item.originalName}
              </div>
              
              <div className="text-slate-400 shrink-0 text-xs">
                {item.action ? `(${item.action}) →` : '→'}
              </div>

              <div className="flex-1 truncate font-medium text-slate-800" title={item.newName}>
                {item.newName}
              </div>

              {item.conflict && (
                <div className="shrink-0 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-md">
                  Conflict: {item.conflict}
                </div>
              )}

              {item.progress !== undefined && (
                <div className="shrink-0 w-24">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {item.status && (
                <div className={`shrink-0 w-20 text-xs font-medium text-right capitalize
                  ${item.status === 'success' || item.status === 'completed' ? 'text-green-600' : ''}
                  ${item.status === 'failed' ? 'text-red-600' : ''}
                  ${item.status === 'skipped' ? 'text-orange-500' : ''}
                  ${item.status === 'processing' ? 'text-blue-600' : ''}
                  ${item.status === 'pending' ? 'text-slate-400' : ''}
                `}>
                  {item.status}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
