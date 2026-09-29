import React from 'react'
import { Folder, FileVideo, History, ChevronRight } from 'lucide-react'
import { Mp4ScanDiff, Mp4ScanSummary } from '../../types/mp4analyzer'
import { formatBytes, formatDuration, cn } from '../../lib/utils'

interface ScanHistoryPanelProps {
  history: Mp4ScanSummary[]
  error: string | null
  onOpenScan: (id: string) => void
}

function scanSeconds(scan: Mp4ScanSummary): number {
  return Math.max(0, (Date.parse(scan.finishedAt) - Date.parse(scan.startedAt)) / 1000)
}

function DiffChips({
  diff,
  targetType
}: {
  diff: Mp4ScanDiff | null
  targetType: 'file' | 'folder'
}): React.JSX.Element {
  if (!diff) {
    return (
      <span className="text-[11px] text-gray-400 font-medium">First scan of this {targetType}</span>
    )
  }

  const chips = [
    { value: diff.newlyCorrupted, label: 'newly corrupted', className: 'bg-rose-50 text-rose-600' },
    { value: diff.fixed, label: 'fixed', className: 'bg-emerald-50 text-emerald-600' },
    { value: diff.newFiles, label: 'new', className: 'bg-blue-50 text-blue-600' },
    { value: diff.removedFiles, label: 'removed', className: 'bg-gray-100 text-gray-500' }
  ].filter((c) => c.value > 0)

  if (chips.length === 0) {
    return <span className="text-[11px] text-gray-400 font-medium">No change since last scan</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.label}
          className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold', c.className)}
        >
          {c.label === 'newly corrupted' ? '+' : ''}
          {c.value} {c.label}
        </span>
      ))}
    </div>
  )
}

export function ScanHistoryPanel({
  history,
  error,
  onOpenScan
}: ScanHistoryPanelProps): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xs">
      {error && (
        <div className="px-4 py-2.5 text-xs font-medium text-rose-600 bg-rose-50/60 border-b border-white/20">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <History size={22} className="text-gray-400 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800">No scans yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Completed and cancelled scans are saved here automatically.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto divide-y divide-gray-50">
          {history.map((scan) => {
            const finished = new Date(scan.finishedAt)
            const TargetIcon = scan.targetType === 'folder' ? Folder : FileVideo
            return (
              <button
                key={scan.id}
                onClick={() => onOpenScan(scan.id)}
                data-testid="mp4-history-row"
                className="w-full text-left px-4 py-3.5 flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer group"
              >
                {/* When & what */}
                <div className="w-40 shrink-0">
                  <div className="text-sm font-semibold text-gray-800">
                    {finished.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {finished.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · took{' '}
                    {formatDuration(scanSeconds(scan))}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <TargetIcon size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate" title={scan.targetPath}>
                      {scan.targetPath.split(/[\\/]/).pop() || scan.targetPath}
                    </span>
                    {/* Scan status */}
                    {scan.status === 'cancelled' ? (
                      <span className="ml-1 shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-600">
                        Cancelled — {scan.filesScanned} of {scan.filesFound} files
                      </span>
                    ) : (
                      <span className="ml-1 shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600">
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate" title={scan.targetPath}>
                    {scan.targetPath}
                  </div>
                  {/* Change since last scan */}
                  <div className="mt-1.5">
                    <DiffChips diff={scan.diff} targetType={scan.targetType} />
                  </div>
                </div>

                {/* Health counts */}
                <div className="shrink-0 grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{scan.filesScanned}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">
                      {formatBytes(scan.totalSize, 1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-600">{scan.healthy}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Healthy</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-cyan-600">{scan.repairable}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">
                      Repairable
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-rose-600">{scan.unrecoverable}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">
                      Unrecoverable
                    </div>
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="text-gray-300 group-hover:text-gray-500 shrink-0"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
