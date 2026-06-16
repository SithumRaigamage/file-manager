import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Search,
  HardDrive,
  LayoutGrid,
  List,
  AlignJustify,
  Table2,
  GitBranch,
  FolderOpen,
  File,
  FileVideo,
  FileAudio,
  FileImage,
  FileText,
  FileCode,
  FileArchive,
  FolderInput,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  MoveDown,
  FolderSearch2,
  Star as StarIcon,
  History,
  Trash2,
  Layers,
  UploadCloud,
  CirclePlus,
  RefreshCw,
  Info,
  Zap,
  PlayCircle
} from 'lucide-react'
import { useSearcherStore, ViewMode, SearchResult, Drive } from '../../store/searcherStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBasename(fullPath: string | null): string {
  if (!fullPath) return ''
  const parts = fullPath.split(/[/\\]/)
  return parts[parts.length - 1] || fullPath
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(ms: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getFileIcon(item: SearchResult): React.ReactNode {
  if (item.type === 'folder') return <FolderOpen size={20} className="text-amber-500" />
  const ext = item.extension.replace('.', '').toLowerCase()
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext))
    return <FileVideo size={20} className="text-rose-500" />
  if (['mp3', 'flac', 'wav', 'aac', 'm4a'].includes(ext))
    return <FileAudio size={20} className="text-purple-500" />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImage size={20} className="text-sky-500" />
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext))
    return <FileText size={20} className="text-emerald-500" />
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'h', 'json'].includes(ext))
    return <FileCode size={20} className="text-indigo-500" />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return <FileArchive size={20} className="text-orange-500" />
  return <File size={20} className="text-gray-400" />
}

function getLargeFileIcon(item: SearchResult): React.ReactNode {
  if (item.type === 'folder') return <FolderOpen size={40} className="text-amber-500" />
  const ext = item.extension.replace('.', '').toLowerCase()
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext))
    return <FileVideo size={40} className="text-rose-500" />
  if (['mp3', 'flac', 'wav', 'aac', 'm4a'].includes(ext))
    return <FileAudio size={40} className="text-purple-500" />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImage size={40} className="text-sky-500" />
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext))
    return <FileText size={40} className="text-emerald-500" />
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'h', 'json'].includes(ext))
    return <FileCode size={40} className="text-indigo-500" />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return <FileArchive size={40} className="text-orange-500" />
  return <File size={40} className="text-gray-400" />
}

// ─── View Components ──────────────────────────────────────────────────────────

function LargeIconCard({
  item,
  onRemove
}: {
  item: SearchResult
  onRemove: (path: string) => void
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all cursor-default group"
    >
      <button
        onClick={() => onRemove(item.fullPath)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center border border-gray-100"
        title="Remove from results"
      >
        <X size={12} />
      </button>
      <div className="w-16 h-16 rounded-xl bg-gray-50 group-hover:bg-violet-50 flex items-center justify-center transition-colors">
        {getLargeFileIcon(item)}
      </div>
      <p className="text-xs font-medium text-gray-700 text-center line-clamp-2 leading-tight w-full">
        {item.name}
      </p>
      {item.type === 'folder' && item.childCount > 0 && (
        <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium">
          +{item.childCount} inside
        </span>
      )}
    </motion.div>
  )
}

function TileCard({
  item,
  onRemove
}: {
  item: SearchResult
  onRemove: (path: string) => void
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all cursor-default group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        {getFileIcon(item)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate pr-6">{item.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {item.type === 'folder'
            ? item.childCount > 0
              ? `Folder · +${item.childCount} matched inside`
              : 'Folder'
            : `${item.extension || 'File'} · ${formatBytes(item.size)}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {item.type === 'folder' && item.childCount > 0 && (
          <span className="text-[10px] shrink-0 text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full font-medium">
            +{item.childCount}
          </span>
        )}
        <button
          onClick={() => onRemove(item.fullPath)}
          className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center border border-gray-100 shrink-0"
          title="Remove from results"
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  )
}

function ListRow({
  item,
  onRemove
}: {
  item: SearchResult
  onRemove: (path: string) => void
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-default group"
    >
      {getFileIcon(item)}
      <span className="text-sm text-gray-700 truncate flex-1">{item.name}</span>
      <div className="flex items-center gap-3">
        {item.type === 'folder' && item.childCount > 0 && (
          <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
            +{item.childCount}
          </span>
        )}
        <button
          onClick={() => onRemove(item.fullPath)}
          className="w-6 h-6 rounded-md bg-transparent text-gray-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shrink-0"
          title="Remove from results"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  )
}

function DetailsTable({
  results,
  onRemove
}: {
  results: SearchResult[]
  onRemove: (path: string) => void
}): React.ReactElement {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Name</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Type</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Size</th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 hidden lg:table-cell">
              Modified
            </th>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 hidden xl:table-cell">
              Path
            </th>
            <th className="w-12 px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <motion.tr
              key={item.fullPath}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-default group"
            >
              <td className="px-4 py-2 flex items-center gap-2 min-w-0">
                {getFileIcon(item)}
                <span className="truncate text-gray-800 font-medium max-w-[180px]">
                  {item.name}
                </span>
                {item.type === 'folder' && item.childCount > 0 && (
                  <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                    +{item.childCount}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-gray-500 capitalize whitespace-nowrap">
                {item.type === 'folder' ? 'Folder' : (item.extension || 'File').toUpperCase()}
              </td>
              <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                {formatBytes(item.size)}
              </td>
              <td className="px-4 py-2 text-gray-500 whitespace-nowrap hidden lg:table-cell">
                {formatDate(item.modifiedAt)}
              </td>
              <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-[200px] hidden xl:table-cell">
                {item.parentPath}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right">
                <button
                  onClick={() => onRemove(item.fullPath)}
                  className="w-8 h-8 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center ml-auto"
                >
                  <X size={14} />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TreeView({
  results,
  onRemove
}: {
  results: SearchResult[]
  onRemove: (path: string) => void
}): React.ReactElement {
  // Build a tree structure grouped by parentPath
  const grouped = new Map<string, SearchResult[]>()
  const allParents = new Set(results.map((r) => r.parentPath))

  for (const item of results) {
    const key = item.parentPath
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  // Sort parents by depth so shallower come first
  const sortedParents = [...grouped.keys()].sort((a, b) => {
    const aDepth = a.split('/').length
    const bDepth = b.split('/').length
    return aDepth - bDepth
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      {sortedParents.map((parent) => {
        const items = grouped.get(parent)!
        const isRoot = !allParents.has(parent.split('/').slice(0, -1).join('/'))
        return (
          <div key={parent} className={`${!isRoot ? 'ml-6' : ''}`}>
            {/* Parent label */}
            <div className="flex items-center gap-1.5 mb-2">
              <ChevronRight size={12} className="text-gray-300" />
              <span className="text-xs text-gray-400 font-mono truncate">{parent}</span>
            </div>
            <div className="ml-4 flex flex-col gap-1 border-l-2 border-gray-100 pl-4">
              {items.map((item) => (
                <motion.div
                  key={item.fullPath}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all cursor-default group"
                >
                  {getFileIcon(item)}
                  <span className="text-sm text-gray-800 font-medium truncate flex-1">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3">
                    {item.type === 'folder' && item.childCount > 0 && (
                      <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        +{item.childCount} inside
                      </span>
                    )}
                    {item.type === 'file' && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatBytes(item.size)}
                      </span>
                    )}
                    <button
                      onClick={() => onRemove(item.fullPath)}
                      className="w-6 h-6 rounded-md bg-transparent text-gray-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Drive Dropdown ───────────────────────────────────────────────────────────

function DriveDropdown({
  drives,
  selected,
  onSelect
}: {
  drives: Drive[]
  selected: Drive | null
  onSelect: (d: Drive) => void
}): React.ReactElement {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="relative">
      <button
        id="searcher-drive-dropdown"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-violet-300 text-sm font-medium text-gray-700 transition-all shadow-sm min-w-[180px] justify-between focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-violet-500 shrink-0" />
          <span className="truncate max-w-[140px]">
            {selected ? selected.name : 'Select Drive'}
          </span>
        </div>
        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[220px] overflow-hidden"
          >
            {drives.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-3">No drives found</p>
            ) : (
              drives.map((drive) => (
                <button
                  key={drive.path}
                  onClick={() => {
                    onSelect(drive)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50 transition-colors text-left ${selected?.path === drive.path ? 'bg-violet-50' : ''}`}
                >
                  <HardDrive
                    size={14}
                    className={drive.type === 'external' ? 'text-amber-500' : 'text-violet-500'}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{drive.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">{drive.path}</p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}

// ─── View mode button ─────────────────────────────────────────────────────────

const viewModes: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
  { mode: 'large-icons', icon: LayoutGrid, label: 'Large Icons' },
  { mode: 'tiles', icon: AlignJustify, label: 'Tiles' },
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'details', icon: Table2, label: 'Details' },
  { mode: 'tree', icon: GitBranch, label: 'Tree' }
]

// ─── Collect Modal ─────────────────────────────────────────────────────────────

function CollectModal({
  isCollecting,
  collectProgress,
  total,
  collectResult,
  onClose
}: {
  isCollecting: boolean
  collectProgress: { moved: number; total: number }
  total: number
  collectResult: { success: boolean; moved: number; newFolderPath: string; errors: string[] } | null
  onClose: () => void
}): React.ReactElement {
  const percent = total > 0 ? Math.round((collectProgress.moved / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
      >
        {isCollecting ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <FolderInput size={20} className="text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Collecting Files…</h2>
                <p className="text-sm text-gray-500">
                  Moving {collectProgress.moved} of {total} items
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="bg-violet-500 h-full rounded-full"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right mt-1">{percent}%</p>
          </>
        ) : collectResult ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              {collectResult.success ? (
                <CheckCircle2 size={32} className="text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle size={32} className="text-amber-500 shrink-0" />
              )}
              <div>
                <h2 className="font-semibold text-gray-900">
                  {collectResult.success ? 'Done!' : 'Completed with errors'}
                </h2>
                <p className="text-sm text-gray-500">
                  Moved {collectResult.moved} item{collectResult.moved !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-2">
              <FolderOpen size={15} className="text-amber-500 shrink-0" />
              <span className="text-xs text-gray-600 font-mono truncate">
                {collectResult.newFolderPath}
              </span>
            </div>

            {collectResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 mb-4">
                <p className="text-xs font-medium text-red-600 mb-1">
                  {collectResult.errors.length} error(s)
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {collectResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">
                      {e}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.api.openPath?.(collectResult.newFolderPath)
                  onClose()
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <ExternalLink size={13} />
                Open Folder
              </button>
            </div>
          </>
        ) : null}
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SearcherPage(): React.ReactElement {
  const {
    drives,
    selectedDrive,
    query,
    isSearching,
    searchProgress,
    results,
    hasSearched,
    viewMode,
    isCollecting,
    collectProgress,
    collectResult,
    sourceFolder,
    destinationFolder,
    savedKeywords,
    setDrives,
    setSelectedDrive,
    setSourceFolder,
    setDestinationFolder,
    setQuery,
    setIsSearching,
    setSearchProgress,
    setResults,
    setViewMode,
    setIsCollecting,
    setCollectProgress,
    setCollectResult,
    removeResult,
    saveKeyword,
    saveKeywords,
    removeKeyword,
    reset
  } = useSearcherStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const showCollectModal = isCollecting || collectResult !== null

  const [activeTab, setActiveTab] = useState('search')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scannedKeywords, setScannedKeywords] = useState<string[]>([])
  const [importFolder, setImportFolder] = useState<string | null>(null)

  // Automation State
  const [isAutomating, setIsAutomating] = useState(false)
  const [automationStep, setAutomationStep] = useState(0)
  const [automationStatus, setAutomationStatus] = useState('')
  const [automationLog, setAutomationLog] = useState<{ msg: string; type: 'info' | 'success' | 'error' }[]>([])

  const handlePickImportRoot = async (): Promise<void> => {
    const folder = await window.api.openDirectory()
    if (folder) setImportFolder(folder)
  }

  const handleScanKeywords = async (): Promise<void> => {
    if (!importFolder) return
    setIsScanning(true)
    try {
      const api = window.api as unknown as {
        searcher: { getFolderNames: (p: string) => Promise<string[]> }
      }
      const names = await api.searcher.getFolderNames(importFolder)
      setScannedKeywords(names)
    } finally {
      setIsScanning(false)
    }
  }

  const handleAddAllKeywords = (): void => {
    saveKeywords(scannedKeywords)
    setScannedKeywords([])
    setImportFolder(null)
    setActiveTab('search') // Automatically switch back to search tab
  }

  // Load drives on mount
  useEffect(() => {
    ;(async (): Promise<void> => {
      const api = window.api as unknown as {
        searcher: {
          getDrives: () => Promise<Drive[]>
        }
      }
      try {
        const d = await api.searcher.getDrives()
        setDrives(d)
        if (d.length > 0) setSelectedDrive(d[0])
      } catch (err) {
        console.error('Failed to load drives', err)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePickSource = async (): Promise<void> => {
    const path = await window.api.openDirectory()
    if (path) setSourceFolder(path)
  }

  const handlePickDestination = async (): Promise<void> => {
    const path = await window.api.openDirectory()
    if (path) setDestinationFolder(path)
  }

  const handleSearch = useCallback(async (): Promise<void> => {
    const searchRoot = sourceFolder || selectedDrive?.path
    if (!searchRoot || !query.trim() || isSearching) return

    reset()
    setIsSearching(true)
    setSearchProgress({ scanned: 0, found: 0 })

    const api = window.api as unknown as {
      searcher: {
        search: (p: { drivePath: string; query: string }) => Promise<SearchResult[]>
        onSearchProgress: (cb: (d: unknown) => void) => () => void
      }
    }

    const cleanup = api.searcher.onSearchProgress((data) => {
      const d = data as { scanned: number; found: number }
      setSearchProgress(d)
    })

    try {
      const r = await api.searcher.search({ drivePath: searchRoot, query: query.trim() })
      setResults(r)
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      cleanup()
      setIsSearching(false)
    }
  }, [
    selectedDrive,
    sourceFolder,
    query,
    isSearching,
    reset,
    setIsSearching,
    setResults,
    setSearchProgress
  ])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleCollect = useCallback(async (): Promise<void> => {
    const destRoot = destinationFolder || selectedDrive?.path
    if (!destRoot || results.length === 0 || isCollecting) return

    setIsCollecting(true)
    setCollectProgress({ moved: 0, total: results.length })
    setCollectResult(null)

    const api = window.api as unknown as {
      searcher: {
        collect: (p: {
          results: SearchResult[]
          destRoot: string
          folderName: string
        }) => Promise<{ success: boolean; moved: number; newFolderPath: string; errors: string[] }>
        onCollectProgress: (cb: (d: unknown) => void) => () => void
      }
    }

    const cleanup = api.searcher.onCollectProgress((data) => {
      const d = data as { moved: number; total: number }
      setCollectProgress(d)
    })

    try {
      const result = await api.searcher.collect({
        results,
        destRoot,
        folderName: query.trim()
      })
      setCollectResult(result)
    } catch (err) {
      setCollectResult({
        success: false,
        moved: 0,
        newFolderPath: '',
        errors: [(err as Error).message]
      })
    } finally {
      cleanup()
      setIsCollecting(false)
    }
  }, [
    setCollectResult,
    setCollectProgress,
    setIsCollecting,
    results,
    query,
    destinationFolder,
    selectedDrive,
    isCollecting
  ])

  const handleAutomation = useCallback(async (): Promise<void> => {
    const searchRoot = sourceFolder || selectedDrive?.path
    const destRoot = destinationFolder || selectedDrive?.path
    if (!searchRoot || !destRoot || savedKeywords.length === 0 || isAutomating) return

    setIsAutomating(true)
    setAutomationStep(0)
    setAutomationLog([{ msg: 'Starting full-drive categorization scan...', type: 'info' }])
    setAutomationStatus('Scanning...')

    const api = window.api as unknown as {
      searcher: {
        batchSearch: (p: { drivePath: string; queries: string[] }) => Promise<Record<string, SearchResult[]>>
        collect: (p: { results: SearchResult[]; destRoot: string; folderName: string }) => Promise<{ success: boolean; moved: number }>
      }
    }

    try {
      // 1. Batch Search
      const batchResults = await api.searcher.batchSearch({ drivePath: searchRoot, queries: savedKeywords })
      
      const totalKeywords = savedKeywords.length
      let overallMoved = 0

      // 2. Process each keyword
      for (let i = 0; i < totalKeywords; i++) {
        const keyword = savedKeywords[i]
        const keywordItems = batchResults[keyword] || []
        
        setAutomationStep(i + 1)
        
        if (keywordItems.length === 0) {
          setAutomationLog(prev => [{ msg: `Skipping "${keyword}": No matches found.`, type: 'info' }, ...prev])
          continue
        }

        setAutomationStatus(`Organizing: ${keyword} (${keywordItems.length} items)`)
        setAutomationLog(prev => [{ msg: `Moving ${keywordItems.length} items to folder "${keyword}"...`, type: 'info' }, ...prev])

        const res = await api.searcher.collect({
          results: keywordItems,
          destRoot,
          folderName: keyword
        })

        if (res.success) {
          overallMoved += res.moved
          setAutomationLog(prev => [{ msg: `Successfully organized "${keyword}".`, type: 'success' }, ...prev])
        } else {
          setAutomationLog(prev => [{ msg: `Completed "${keyword}" with some issues.`, type: 'error' }, ...prev])
        }
      }

      setAutomationStatus('Complete')
      setAutomationLog(prev => [{ msg: `Automation finished! Total items organized: ${overallMoved}`, type: 'success' }, ...prev])
    } catch (err) {
      setAutomationLog(prev => [{ msg: `Automation failed: ${(err as Error).message}`, type: 'error' }, ...prev])
    } finally {
      setIsAutomating(false)
    }
  }, [sourceFolder, destinationFolder, selectedDrive, savedKeywords, isAutomating])

  const handleCloseModal = (): void => {
    setCollectResult(null)
    if (collectResult?.success) reset()
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50/30 overflow-hidden">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Top Header with Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 pt-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <FolderSearch2 size={24} className="text-violet-600" />
              Disk Searcher
            </h1>
            <Tabs.List className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <Tabs.Trigger
                value="search"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Search size={14} />
                Search
              </Tabs.Trigger>
              <Tabs.Trigger
                value="import"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Layers size={14} />
                Import
              </Tabs.Trigger>
              <Tabs.Trigger
                value="automation"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Zap size={14} />
                Automation
              </Tabs.Trigger>
            </Tabs.List>
          </div>
        </div>

        {/* Tab Content: Search */}
        <Tabs.Content
          value="search"
          className="flex flex-col h-full overflow-hidden focus:outline-none"
        >
          {/* Main Control Panel (re-organized) */}
          <div className="shrink-0 bg-white border-b border-gray-100 shadow-sm relative z-0">
            {/* Row 1: Source + Query + Destination */}
            <div className="p-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 mr-auto">
                <Info size={12} className="text-violet-400" />
                Recursive tree mapping + exact match deduplication
              </div>

              <DriveDropdown drives={drives} selected={selectedDrive} onSelect={setSelectedDrive} />

              {/* Source Folder Picker */}
              <button
                onClick={handlePickSource}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm max-w-[220px] focus:outline-none ${
                  sourceFolder
                    ? 'bg-violet-50 border-violet-200 text-violet-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'
                }`}
                title={sourceFolder || 'Choose specific source folder'}
              >
                <FolderSearch2
                  size={15}
                  className={sourceFolder ? 'text-violet-600' : 'text-gray-400'}
                />
                <span className="truncate">
                  {sourceFolder ? getBasename(sourceFolder) : 'Search In…'}
                </span>
              </button>

              {/* Destination Folder Picker */}
              <button
                onClick={handlePickDestination}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm max-w-[220px] focus:outline-none ${
                  destinationFolder
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'
                }`}
                title={destinationFolder || 'Choose collection destination'}
              >
                <MoveDown
                  size={15}
                  className={destinationFolder ? 'text-emerald-600' : 'text-gray-400'}
                />
                <span className="truncate">
                  {destinationFolder ? getBasename(destinationFolder) : 'Collect To…'}
                </span>
              </button>

              {/* Search input */}
              <div className="flex-1 relative group">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  ref={inputRef}
                  id="searcher-query-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a name to search… (e.g. anime_1, MyDocument)"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 focus:bg-white transition-all font-medium"
                />
                {query.trim() && (
                  <button
                    onClick={() => saveKeyword(query)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100 focus:outline-none"
                    title="Save keyword"
                  >
                    <StarIcon
                      size={14}
                      fill={savedKeywords.includes(query.trim()) ? 'currentColor' : 'none'}
                    />
                  </button>
                )}
              </div>

              {/* Search button */}
              <button
                id="searcher-search-btn"
                onClick={handleSearch}
                disabled={!selectedDrive || !query.trim() || isSearching}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-violet-200 active:scale-95 focus:outline-none"
              >
                {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {isSearching ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* Row 2: Saved Keywords */}
            {savedKeywords.length > 0 && (
              <div className="flex flex-col gap-2 px-5 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
                    <History size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Saved</span>
                  </div>
                  
                  {/* Keyword mini-search */}
                  <div className="relative flex-1 max-w-[240px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                    <input
                      type="text"
                      placeholder="Filter keywords…"
                      value={keywordFilter}
                      onChange={(e) => setKeywordFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 rounded-lg border border-gray-100 bg-gray-50/50 text-[11px] placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-200 focus:border-violet-300 focus:bg-white transition-all font-medium"
                    />
                    {keywordFilter && (
                      <button 
                        onClick={() => setKeywordFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1.5 py-0.5">
                  {savedKeywords
                    .filter(kw => kw.toLowerCase().includes(keywordFilter.toLowerCase()))
                    .map((kw) => (
                      <div
                        key={kw}
                        className="group flex items-center bg-white border border-gray-100 hover:border-violet-200 rounded-lg px-2 py-1 transition-all shadow-sm"
                      >
                        <button
                          onClick={() => {
                            setQuery(kw)
                            handleSearch()
                          }}
                          className="text-[11px] font-mono font-medium text-gray-600 hover:text-violet-700 transition-colors focus:outline-none"
                        >
                          {kw}
                        </button>
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="ml-1.5 p-0.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  
                  {savedKeywords.filter(kw => kw.toLowerCase().includes(keywordFilter.toLowerCase())).length === 0 && (
                    <p className="text-[10px] text-gray-400 italic py-1">No keywords match &quot;{keywordFilter}&quot;</p>
                  )}
                </div>
              </div>
            )}

            {/* Row 3: View mode toggles + live progress + collect CTA */}
            <div className="flex items-center justify-between px-5 pb-3">
              {/* View mode */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {viewModes.map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    id={`searcher-view-${mode}`}
                    title={label}
                    onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all focus:outline-none ${
                      viewMode === mode
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Progress / results count */}
              <div className="flex items-center gap-4">
                {isSearching && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs text-gray-500"
                  >
                    <Loader2 size={13} className="animate-spin text-violet-500" />
                    <span>
                      Scanned{' '}
                      <span className="font-semibold text-gray-700">
                        {searchProgress.scanned.toLocaleString()}
                      </span>{' '}
                      · Found{' '}
                      <span className="font-semibold text-violet-700">
                        {searchProgress.found.toLocaleString()}
                      </span>
                    </span>
                  </motion.div>
                )}

                {!isSearching && hasSearched && (
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{results.length}</span>{' '}
                    {results.length === 1 ? 'result' : 'results'} found
                  </span>
                )}

                {/* Collect button */}
                {results.length > 0 && !isSearching && (
                  <motion.button
                    id="searcher-collect-btn"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleCollect}
                    className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm shadow-violet-200 active:scale-95 focus:outline-none"
                  >
                    <FolderInput size={13} />
                    Collect {results.length} items
                    <ChevronRight size={12} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* ZONE 2: Results Area */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              {/* Idle state */}
              {!hasSearched && !isSearching && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-4 text-center px-6"
                >
                  <div className="w-20 h-20 rounded-3xl bg-violet-50 flex items-center justify-center">
                    <Search size={36} className="text-violet-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Search your disk</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm leading-relaxed">
                      Select a drive, type a name, and FileFlow will find every matching file and folder
                      — in every casing variant.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {['anime_1', 'myDocument', 'MY_PHOTO', 'project-files'].map((ex) => (
                      <button
                        key={ex}
                        onClick={() => {
                          setQuery(ex)
                          inputRef.current?.focus()
                        }}
                        className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-colors font-mono focus:outline-none"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Searching */}
              {isSearching && results.length === 0 && (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-5"
                >
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-violet-100 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={36} className="text-violet-500 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-700">Searching…</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Scanned{' '}
                      <span className="font-bold text-gray-600">
                        {searchProgress.scanned.toLocaleString()}
                      </span>{' '}
                      items
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Empty results */}
              {hasSearched && !isSearching && results.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-4 text-center px-6"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
                    <FolderOpen size={36} className="text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-600">No matches found</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      No files or folders matched{' '}
                      <span className="font-mono font-semibold text-gray-600">&quot;{query}&quot;</span>
                      on {getBasename(sourceFolder || selectedDrive?.path || '')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      reset()
                      inputRef.current?.focus()
                    }}
                    className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium focus:outline-none"
                  >
                    <X size={12} /> Clear search
                  </button>
                </motion.div>
              )}

              {/* Results list */}
              {results.length > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col"
                >
                  {viewMode === 'large-icons' && (
                    <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3 content-start">
                      {results.map((item) => (
                        <LargeIconCard key={item.fullPath} item={item} onRemove={removeResult} />
                      ))}
                    </div>
                  )}

                  {viewMode === 'tiles' && (
                    <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 content-start">
                      {results.map((item) => (
                        <TileCard key={item.fullPath} item={item} onRemove={removeResult} />
                      ))}
                    </div>
                  )}

                  {viewMode === 'list' && (
                    <div className="p-4">
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {results.map((item) => (
                          <ListRow key={item.fullPath} item={item} onRemove={removeResult} />
                        ))}
                      </div>
                    </div>
                  )}

                  {viewMode === 'details' && (
                    <DetailsTable results={results} onRemove={removeResult} />
                  )}

                  {viewMode === 'tree' && <TreeView results={results} onRemove={removeResult} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs.Content>

        {/* Tab Content: Import */}
        <Tabs.Content value="import" className="flex flex-col h-full overflow-hidden focus:outline-none pb-20">
          <div className="p-8 max-w-4xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden"
            >
              <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">Import Bulk Keywords</h2>
                  <p className="text-emerald-50/80 text-sm max-w-md leading-relaxed">
                    Point us to your library folder (e.g. your Anime or Movie directory) and we will automatically extract all subfolder names to build your search library.
                  </p>
                </div>
                <UploadCloud size={120} className="absolute -right-8 -bottom-8 text-emerald-500/20" />
              </div>

              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={handlePickImportRoot}
                    className="flex-1 flex items-center justify-between gap-4 px-6 py-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group focus:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <FolderOpen size={24} className="text-gray-400 group-hover:text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-700">Choose Library Folder</p>
                        <p className="text-xs text-gray-400 font-mono truncate max-w-[300px]">
                          {importFolder || 'No folder selected'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500" />
                  </button>

                  <button
                    disabled={!importFolder || isScanning}
                    onClick={handleScanKeywords}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all flex items-center gap-2 shrink-0 focus:outline-none"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Scanning…
                      </>
                    ) : (
                      <>
                        <RefreshCw size={20} />
                        Scan Library
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {scannedKeywords.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
                        <div>
                          <span className="text-emerald-700 font-bold">
                            {scannedKeywords.length}
                          </span>
                          <span className="text-emerald-600/70 text-sm ml-1.5">
                            keywords discovered
                          </span>
                        </div>
                        <button
                          onClick={handleAddAllKeywords}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm focus:outline-none"
                        >
                          <CirclePlus size={14} />
                          Add All to Searcher
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {scannedKeywords.map((kw) => (
                          <div
                            key={kw}
                            className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl group hover:border-emerald-200 transition-all"
                          >
                            <span className="text-xs font-mono font-medium text-gray-700 truncate">
                              {kw}
                            </span>
                            <button
                              onClick={() => setScannedKeywords((prev) => prev.filter((k) => k !== kw))}
                              className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    !isScanning && (
                      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                        <LayoutGrid size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Scan a folder to extract keywords</p>
                        <p className="text-xs mt-1">
                          We&apos;ll look for subfolder names to add to your library.
                        </p>
                      </div>
                    )
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </Tabs.Content>

        {/* Tab Content: Automation */}
        <Tabs.Content value="automation" className="flex flex-col h-full overflow-hidden focus:outline-none pb-20">
          <div className="p-8 max-w-4xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden"
            >
              <div className="bg-amber-500 p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">Drive Automation</h2>
                  <p className="text-amber-50/80 text-sm max-w-md leading-relaxed">
                    Automate your file organization. We will scan your entire drive for your {savedKeywords.length} saved keywords and move every match into its own dedicated folder.
                  </p>
                </div>
                <Zap size={120} className="absolute -right-8 -bottom-8 text-amber-400/30" />
              </div>

              <div className="p-8">
                {isAutomating ? (
                  <div className="space-y-8 py-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <RefreshCw size={32} className="text-amber-500 animate-spin" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{automationStatus}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Keyword {automationStep} of {savedKeywords.length}
                      </p>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                          <span>Overall Progress</span>
                          <span>{Math.round((automationStep / savedKeywords.length) * 100)}%</span>
                       </div>
                       <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200 p-0.5">
                          <motion.div 
                            className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full shadow-sm"
                            animate={{ width: `${(automationStep / savedKeywords.length) * 100}%` }}
                          />
                       </div>
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar-dark border shadow-inner">
                       {automationLog.map((log, i) => (
                         <div key={i} className={`mb-1 ${log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : 'text-amber-200'}`}>
                           <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                           {log.msg}
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Total Managed Keywords</p>
                        <p className="text-3xl font-black text-gray-800">{savedKeywords.length}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Automation Scope</p>
                        <p className="text-sm font-bold text-gray-700 truncate">{getBasename(sourceFolder || selectedDrive?.path || 'None')}</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                      <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">How it works</p>
                        <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                          We will perform a single deep scan of your source folder. Any file or folder starting with your saved keywords will be moved to a matching subfolder in your destination directory. Existing folders will be merged.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleAutomation}
                      disabled={savedKeywords.length === 0 || (!sourceFolder && !selectedDrive)}
                      className="w-full py-5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-black text-lg shadow-xl shadow-amber-200 hover:shadow-amber-400 transition-all flex items-center justify-center gap-3 active:scale-95 focus:outline-none"
                    >
                      <PlayCircle size={24} />
                      Start Organizing All Keywords
                    </button>
                    
                    {savedKeywords.length === 0 && (
                      <p className="text-xs text-center text-rose-500 font-medium">Please add some keywords first</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* ZONE 3: Collect Action Bar */}
      <AnimatePresence>
        {results.length > 0 && !isSearching && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="shrink-0 bg-white border-t border-gray-100 px-5 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <FolderInput size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {results.length} item{results.length !== 1 ? 's' : ''} ready to collect
                </p>
                <p className="text-xs text-gray-400">
                  Will be moved to{' '}
                  <span className="font-mono text-gray-600">
                    {destinationFolder || selectedDrive?.path}/{query.trim()}
                  </span>
                </p>
              </div>
            </div>

            <button
              id="searcher-collect-bar-btn"
              onClick={handleCollect}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200 active:scale-95 focus:outline-none"
            >
              <FolderInput size={15} />
              Move All to Folder
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collect Modal Overlay */}
      <AnimatePresence>
        {showCollectModal && (
          <CollectModal
            isCollecting={isCollecting}
            collectProgress={collectProgress}
            total={results.length}
            collectResult={collectResult}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
