import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, Eye, FileVideo2, FolderOpen, Trash2 } from 'lucide-react'
import { Mp4FileResult, CorruptionLevel } from '../../types/mp4analyzer'
import { Badge } from '../ui/Badge'
import { useMp4AnalyzerStore } from '../../store/mp4AnalyzerStore'

interface ResultsTableProps {
  results: Mp4FileResult[]
  onSelectFile: (file: Mp4FileResult) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(secs: number): string {
  if (!secs || isNaN(secs)) return '00:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)

  const mStr = m.toString().padStart(2, '0')
  const sStr = s.toString().padStart(2, '0')

  if (h > 0) {
    const hStr = h.toString().padStart(2, '0')
    return `${hStr}:${mStr}:${sStr}`
  }
  return `${mStr}:${sStr}`
}

export function ResultsTable({ results, onSelectFile }: ResultsTableProps): React.JSX.Element {
  const { removeResult, removeFolderResults, scannedFolder } = useMp4AnalyzerStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof Mp4FileResult | 'healthScore'>('fileName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const getCorruptionColor = (
    level: CorruptionLevel
  ): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (level) {
      case 'healthy':
        return 'success' as const
      case 'minor':
        return 'warning' as const
      case 'moderate':
        return 'warning' as const // Yellow-orange in theme
      case 'severe':
        return 'destructive' as const
      case 'unrecoverable':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }

  const getHealthBarColor = (score: number): string => {
    if (score > 98) return 'bg-emerald-500'
    if (score >= 90) return 'bg-yellow-500'
    if (score >= 70) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const handleSort = (field: keyof Mp4FileResult | 'healthScore'): void => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const corruptedFiles = useMemo(() => {
    return results.filter((r) => r.corruptionLevel !== 'healthy')
  }, [results])

  const corruptedFilesCount = corruptedFiles.length

  const handleDeleteAllCorrupted = async (): Promise<void> => {
    const filePaths = corruptedFiles.map((r) => r.filePath)
    if (filePaths.length === 0) return

    try {
      const res = await window.api.mp4analyzer.deleteMultipleFiles(filePaths, scannedFolder)
      if (res.success) {
        res.deletedFolders.forEach((folder) => {
          removeFolderResults(folder)
        })
        res.deletedFiles.forEach((file) => {
          removeResult(file)
        })
      }
    } catch (err) {
      alert(`Failed to delete files: ${(err as Error).message}`)
    }
  }

  const filteredResults = useMemo(() => {
    return results
      .filter((r) => {
        const matchesSearch = r.fileName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || r.corruptionLevel === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let valA: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let valB: any

        if (sortField === 'healthScore') {
          valA = a.playbackVerification?.healthScore ?? 0
          valB = b.playbackVerification?.healthScore ?? 0
        } else {
          valA = a[sortField] ?? ''
          valB = b[sortField] ?? ''
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA
      })
  }, [results, searchTerm, statusFilter, sortField, sortOrder])

  const renderSortIcon = (field: keyof Mp4FileResult | 'healthScore'): React.ReactNode => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp size={14} className="inline ml-1 text-gray-500" />
    ) : (
      <ChevronDown size={14} className="inline ml-1 text-gray-500" />
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md border border-white/40 border-white/20 rounded-2xl overflow-hidden shadow-xs">
      {/* Controls Bar */}
      <div className="p-4 border-b border-white/20 bg-transparent flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search scanned files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/40"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-white/30 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/40 text-gray-700 font-medium cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="healthy">Healthy</option>
              <option value="minor">Minor Corruption</option>
              <option value="moderate">Moderate Corruption</option>
              <option value="severe">Severe Corruption</option>
              <option value="unrecoverable">Unrecoverable</option>
            </select>
          </div>

          {corruptedFilesCount > 0 && (
            <button
              onClick={handleDeleteAllCorrupted}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
              title="Delete all corrupted videos (minor, moderate, severe, and unrecoverable)"
            >
              <Trash2 size={14} />
              Delete All Corrupted ({corruptedFilesCount})
            </button>
          )}
        </div>
      </div>

      {/* Table container */}
      <div className="flex-1 overflow-auto">
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
            <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center text-gray-400 mb-3">
              <FileVideo2 size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">No matching videos</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              {results.length === 0
                ? 'Scan a single MP4 file or folder to start video diagnostics.'
                : 'Try adjusting your search criteria or filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/20 bg-transparent/30 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-transparent"
                  onClick={() => handleSort('fileName')}
                >
                  File Name {renderSortIcon('fileName')}
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-transparent"
                  onClick={() => handleSort('fileSize')}
                >
                  Size {renderSortIcon('fileSize')}
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-transparent"
                  onClick={() => handleSort('healthScore')}
                >
                  Health Score {renderSortIcon('healthScore')}
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-transparent"
                  onClick={() => handleSort('corruptionLevel')}
                >
                  Status {renderSortIcon('corruptionLevel')}
                </th>
                <th className="py-3.5 px-4">Error count</th>
                <th className="py-3.5 px-4">Recommendation</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
              {filteredResults.map((r) => {
                const score = r.playbackVerification?.healthScore ?? 100
                const duration = r.metadata?.duration || 0
                const resolution = r.metadata?.resolution || 'Unknown'

                return (
                  <tr
                    key={r.filePath}
                    className="hover:bg-transparent transition-colors group cursor-pointer"
                    onClick={() => onSelectFile(r)}
                  >
                    <td className="py-3.5 px-4 max-w-[240px] truncate">
                      <div className="font-semibold text-gray-800 truncate" title={r.fileName}>
                        {r.fileName}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {resolution !== 'Unknown' ? `${resolution} • ` : ''}
                        {duration > 0 ? formatDuration(duration) : 'No Stream'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 font-medium">
                      {formatBytes(r.fileSize)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getHealthBarColor(score)}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-800 text-xs">{score}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={getCorruptionColor(r.corruptionLevel)}
                        className="capitalize font-semibold"
                      >
                        {r.corruptionLevel.replace('-', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 font-semibold text-xs">
                      {r.ffmpegValidation.errorCount + r.ffmpegValidation.warningCount}
                    </td>
                    <td className="py-3.5 px-4 max-w-[280px] truncate text-xs text-gray-500 font-medium">
                      {r.recommendation.action}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.api.showItemInFolder(r.filePath)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Open file location in Finder"
                        >
                          <FolderOpen size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectFile(r)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer inline-flex items-center justify-center"
                          title="View detailed diagnostics"
                        >
                          <Eye size={16} />
                        </button>
                        {r.corruptionLevel !== 'healthy' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const res = await window.api.mp4analyzer.deleteFile(r.filePath)
                                if (res.success) {
                                  if (res.action === 'folder') {
                                    removeFolderResults(res.folderPath)
                                  } else if (res.action === 'file') {
                                    removeResult(res.filePath)
                                  }
                                }
                              } catch (err) {
                                alert(`Failed to delete: ${(err as Error).message}`)
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-455 hover:text-red-605 hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Delete corrupted video file"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/20 bg-transparent/30 text-xs text-gray-400 flex items-center justify-between">
        <span>
          Showing {filteredResults.length} of {results.length} files
        </span>
        <span>Click a row to open deep repair tools & metadata info.</span>
      </div>
    </div>
  )
}
