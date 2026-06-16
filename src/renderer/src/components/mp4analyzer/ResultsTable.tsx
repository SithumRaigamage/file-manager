import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, Eye, FileVideo2 } from 'lucide-react'
import { Mp4FileResult, CorruptionLevel } from '../../types/mp4analyzer'
import { Badge } from '../ui/Badge'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof Mp4FileResult | 'healthScore'>('fileName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const getCorruptionColor = (level: CorruptionLevel) => {
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

  const getHealthBarColor = (score: number) => {
    if (score > 98) return 'bg-emerald-500'
    if (score >= 90) return 'bg-yellow-500'
    if (score >= 70) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const handleSort = (field: keyof Mp4FileResult | 'healthScore') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
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
        let valA: any
        let valB: any

        if (sortField === 'healthScore') {
          valA = a.playbackVerification?.healthScore ?? 0
          valB = b.playbackVerification?.healthScore ?? 0
        } else {
          valA = a[sortField] ?? ''
          valB = b[sortField] ?? ''
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA)
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA
      })
  }, [results, searchTerm, statusFilter, sortField, sortOrder])

  const SortIcon = ({ field }: { field: keyof Mp4FileResult | 'healthScore' }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-gray-500" /> : <ChevronDown size={14} className="inline ml-1 text-gray-500" />
  }

  return (
    <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
      {/* Controls Bar */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search scanned files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-700 font-medium cursor-pointer"
          >
            <option value="all">All States</option>
            <option value="healthy">Healthy</option>
            <option value="minor">Minor Corruption</option>
            <option value="moderate">Moderate Corruption</option>
            <option value="severe">Severe Corruption</option>
            <option value="unrecoverable">Unrecoverable</option>
          </select>
        </div>
      </div>

      {/* Table container */}
      <div className="flex-1 overflow-auto">
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
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
              <tr className="border-b border-gray-100 bg-gray-50/30 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('fileName')}>
                  File Name <SortIcon field="fileName" />
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('fileSize')}>
                  Size <SortIcon field="fileSize" />
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('healthScore')}>
                  Health Score <SortIcon field="healthScore" />
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('corruptionLevel')}>
                  Status <SortIcon field="corruptionLevel" />
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
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
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
                      <Badge variant={getCorruptionColor(r.corruptionLevel)} className="capitalize font-semibold">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-400 flex items-center justify-between">
        <span>Showing {filteredResults.length} of {results.length} files</span>
        <span>Click a row to open deep repair tools & metadata info.</span>
      </div>
    </div>
  )
}
