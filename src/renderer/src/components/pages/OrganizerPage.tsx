import React, { useCallback, useEffect } from 'react'
import { FolderOpen, Play, Eye, RotateCcw, ArrowRight, CheckCircle2, XCircle, FolderInput, Copy, MoveRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrganizerStore } from '../../store/organizerStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Progress } from '../ui/Progress'
import { formatBytes, getCategoryColor } from '../../lib/utils'

export function OrganizerPage(): React.JSX.Element {
  const {
    sourceDir, rules, mode, preview, result, isScanning, isExecuting, progress, scanStats,
    setSourceDir, toggleRule, setMode, setPreview, setIsScanning, setIsExecuting,
    setProgress, setResult, setScanStats, reset
  } = useOrganizerStore()

  const handleSelectDirectory = async (): Promise<void> => {
    const dir = await window.api.openDirectory()
    if (dir) setSourceDir(dir)
  }

  const handleScan = useCallback(async (): Promise<void> => {
    if (!sourceDir) return
    setIsScanning(true)
    try {
      const stats = await window.api.organizer.scan(sourceDir)
      setScanStats(stats)
    } finally {
      setIsScanning(false)
    }
  }, [sourceDir, setIsScanning, setScanStats])

  useEffect(() => {
    if (sourceDir) handleScan()
  }, [sourceDir, handleScan])

  const handlePreview = async (): Promise<void> => {
    if (!sourceDir) return
    setIsScanning(true)
    try {
      const items = await window.api.organizer.preview({
        sourceDir,
        rules: rules.map((r) => ({ extensions: r.extensions, folderName: r.folderName, enabled: r.enabled })),
        createSubfolders: true,
        mode
      })
      setPreview(items)
    } finally {
      setIsScanning(false)
    }
  }

  const handleExecute = async (): Promise<void> => {
    if (!sourceDir || preview.length === 0) return
    setIsExecuting(true)
    setProgress({ processed: 0, total: preview.length, fileName: '' })
    const cleanup = window.api.organizer.onProgress((data: unknown) => {
      const p = data as { processed: number; total: number; fileName: string }
      setProgress(p)
    })
    try {
      const res = await window.api.organizer.execute({
        sourceDir,
        rules: rules.map((r) => ({ extensions: r.extensions, folderName: r.folderName, enabled: r.enabled })),
        createSubfolders: true,
        mode
      })
      setResult(res as { success: boolean; processed: number; skipped: number; errors: string[] })
    } finally {
      setIsExecuting(false)
      setProgress(null)
      cleanup()
      handleScan()
    }
  }

  const groupedPreview = preview.reduce<Record<string, typeof preview>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">File Organizer</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sort files into folders by type automatically</p>
          </div>
          {(sourceDir || result) && (
            <Button variant="ghost" size="sm" onClick={reset} className="text-gray-400">
              <RotateCcw size={14} />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Result Banner */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-xl p-4 border flex items-start gap-3 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                {result.success ? (
                  <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`font-semibold text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.success ? 'Organization complete!' : 'Completed with errors'}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {result.processed} files processed · {result.skipped} skipped
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {result.errors.slice(0, 3).map((e, i) => (
                        <li key={i} className="text-xs text-red-600">{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-5">
            {/* Source Folder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderInput size={16} className="text-blue-600" />
                  Source Folder
                </CardTitle>
                <CardDescription>Select the folder to organize</CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={handleSelectDirectory}
                  className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-pointer"
                >
                  <FolderOpen size={24} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                  {sourceDir ? (
                    <div className="text-center px-2">
                      <p className="text-xs font-medium text-gray-600 truncate max-w-full">
                        {sourceDir.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{sourceDir}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 group-hover:text-blue-500">Click to select folder</p>
                  )}
                </button>

                {scanStats && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">{scanStats.totalFiles} files found</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(scanStats.byExtension)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([ext, count]) => (
                          <Badge key={ext} variant="secondary" className="text-xs">
                            {ext} ×{count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MoveRight size={16} className="text-violet-600" />
                  Operation Mode
                </CardTitle>
                <CardDescription>Move or copy files to destination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(['move', 'copy'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${mode === m ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === m ? 'bg-blue-500' : 'bg-gray-100'}`}>
                      {m === 'move' ? (
                        <MoveRight size={16} className={mode === m ? 'text-white' : 'text-gray-500'} />
                      ) : (
                        <Copy size={16} className={mode === m ? 'text-white' : 'text-gray-500'} />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium capitalize ${mode === m ? 'text-blue-700' : 'text-gray-700'}`}>{m} Files</p>
                      <p className="text-xs text-gray-400">
                        {m === 'move' ? 'Move originals to folders' : 'Keep originals, copy to folders'}
                      </p>
                    </div>
                    {mode === m && (
                      <CheckCircle2 size={16} className="text-blue-500 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Rules Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Rules</CardTitle>
                  <CardDescription>Choose which file types to organize</CardDescription>
                </div>
                <Badge variant="secondary">{rules.filter((r) => r.enabled).length} active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {rules.map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => toggleRule(rule.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${rule.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200 opacity-60'}`}
                  >
                    <span className="text-xl">{rule.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${rule.enabled ? 'text-blue-700' : 'text-gray-600'}`}>
                        {rule.folderName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{rule.extensions.slice(0, 3).join(', ')}…</p>
                    </div>
                    <div className={`ml-auto shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${rule.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                      {rule.enabled && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          {preview.length > 0 && !result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Preview — {preview.length} files</CardTitle>
                      <CardDescription>Review before organizing</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {Object.entries(groupedPreview).map(([cat, items]) => (
                        <Badge key={cat} className={getCategoryColor(cat)}>
                          {items.length} {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-100">
                      <span>Source File</span>
                      <span></span>
                      <span>Destination</span>
                      <span>Size</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {preview.map((item, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-2 px-3 py-2 hover:bg-gray-50 text-sm">
                          <span className="truncate text-gray-700">{item.fileName}</span>
                          <ArrowRight size={12} className="text-gray-300 shrink-0" />
                          <span className="truncate text-blue-600 font-medium">
                            {item.category}/{item.fileName}
                          </span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{formatBytes(item.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Progress */}
          <AnimatePresence>
            {isExecuting && progress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Organizing files…</p>
                      <p className="text-sm text-gray-500">{progress.processed}/{progress.total}</p>
                    </div>
                    <Progress value={progress.processed} max={progress.total} color="blue" />
                    <p className="text-xs text-gray-400 mt-1.5 truncate">{progress.fileName}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={!sourceDir || isScanning || isExecuting}
          id="organizer-preview-btn"
        >
          <Eye size={16} />
          {isScanning ? 'Scanning…' : 'Preview'}
        </Button>
        <Button
          onClick={handleExecute}
          disabled={preview.length === 0 || isExecuting || !!result}
          className="gap-2"
          id="organizer-execute-btn"
        >
          <Play size={16} />
          {isExecuting ? 'Organizing…' : `Organize ${preview.length > 0 ? preview.length + ' Files' : ''}`}
        </Button>
        {preview.length === 0 && !isScanning && sourceDir && (
          <p className="text-xs text-gray-400 ml-1">Click Preview to see what will be moved</p>
        )}
      </div>
    </div>
  )
}
