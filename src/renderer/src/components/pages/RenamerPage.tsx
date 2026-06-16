import React, { useCallback, useEffect } from 'react'
import {
  FolderOpen, Play, RotateCcw, CheckCircle2, XCircle, AlertCircle, Undo2,
  List, Type, SortAsc, SortDesc, Calendar, Hash
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRenamerStore } from '../../store/renamerStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatBytes } from '../../lib/utils'

const PATTERN_TYPES = [
  { type: 'sequential', label: 'Sequential', icon: Hash, description: 'file_1, file_2…' },
  { type: 'prefix', label: 'Add Prefix', icon: SortDesc, description: 'PREFIX_name' },
  { type: 'suffix', label: 'Add Suffix', icon: SortAsc, description: 'name_SUFFIX' },
  { type: 'replace', label: 'Find & Replace', icon: Type, description: 'old → new' },
  { type: 'date', label: 'Date', icon: Calendar, description: '2024-01-15_name' }
] as const

export function RenamerPage(): React.JSX.Element {
  const {
    sourceDir, files, selectedPaths, pattern, preview, lastExecuted,
    isLoading, isExecuting, result,
    setSourceDir, setFiles, toggleFile, selectAll, deselectAll,
    setPattern, setPreview, setLastExecuted, setIsLoading, setIsExecuting, setResult, reset
  } = useRenamerStore()

  const handleSelectDirectory = async (): Promise<void> => {
    const dir = await window.api.openDirectory()
    if (!dir) return
    setSourceDir(dir)
    setIsLoading(true)
    try {
      const fileList = await window.api.renamer.listFiles(dir)
      setFiles(fileList.map((f) => ({ ...f, selected: false })))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = useCallback(async (): Promise<void> => {
    const selected = files.filter((f) => selectedPaths.has(f.path))
    if (selected.length === 0) {
      setPreview([])
      return
    }
    setIsLoading(true)
    try {
      const items = await window.api.renamer.preview(selected.map((f) => f.path), pattern)
      setPreview(items)
    } finally {
      setIsLoading(false)
    }
  }, [files, selectedPaths, pattern, setPreview, setIsLoading])

  useEffect(() => {
    if (selectedPaths.size > 0) {
      const timeout = setTimeout(handlePreview, 400)
      return () => clearTimeout(timeout)
    } else {
      setPreview([])
      return undefined
    }
  }, [selectedPaths, pattern, handlePreview, setPreview])

  const handleExecute = async (): Promise<void> => {
    if (preview.length === 0) return
    setIsExecuting(true)
    try {
      const res = await window.api.renamer.execute(preview)
      setResult(res)
      setLastExecuted(preview)
      setPreview([])
    } finally {
      setIsExecuting(false)
      if (sourceDir) {
        const fileList = await window.api.renamer.listFiles(sourceDir)
        setFiles(fileList.map((f) => ({ ...f, selected: false })))
      }
    }
  }

  const handleUndo = async (): Promise<void> => {
    if (lastExecuted.length === 0) return
    await window.api.renamer.undo(lastExecuted)
    setLastExecuted([])
    setResult(null)
    if (sourceDir) {
      const fileList = await window.api.renamer.listFiles(sourceDir)
      setFiles(fileList.map((f) => ({ ...f, selected: false })))
    }
  }

  const selectedCount = selectedPaths.size
  const conflictCount = preview.filter((p) => p.conflict).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Renamer</h2>
            <p className="text-sm text-gray-500 mt-0.5">Rename multiple files with powerful patterns</p>
          </div>
          <div className="flex gap-2">
            {lastExecuted.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleUndo} id="renamer-undo-btn">
                <Undo2 size={14} />
                Undo Last
              </Button>
            )}
            {sourceDir && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-gray-400">
                <RotateCcw size={14} />
                Reset
              </Button>
            )}
          </div>
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
                exit={{ opacity: 0 }}
                className={`rounded-xl p-4 border flex items-start gap-3 ${result.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
              >
                {result.success ? (
                  <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`font-semibold text-sm ${result.success ? 'text-green-800' : 'text-amber-800'}`}>
                    {result.renamed} files renamed successfully
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

          <div className="grid grid-cols-5 gap-5">
            {/* Left: File List */}
            <div className="col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <List size={16} className="text-violet-600" />
                    File Selection
                  </CardTitle>
                  <CardDescription>
                    {sourceDir ? `${files.length} files found` : 'Select a folder to begin'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full mb-3" onClick={handleSelectDirectory} id="renamer-select-folder-btn">
                    <FolderOpen size={16} />
                    {sourceDir ? sourceDir.split('/').pop() : 'Choose Folder'}
                  </Button>

                  {files.length > 0 && (
                    <>
                      <div className="flex gap-2 mb-2">
                        <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs text-violet-600">
                          Select All
                        </Button>
                        <Button size="sm" variant="ghost" onClick={deselectAll} className="text-xs text-gray-400">
                          Deselect All
                        </Button>
                        <Badge variant="secondary" className="ml-auto">{selectedCount} selected</Badge>
                      </div>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                          {files.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => toggleFile(file.path)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${selectedPaths.has(file.path) ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                            >
                              <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${selectedPaths.has(file.path) ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                                {selectedPaths.has(file.path) && (
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                    <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {isLoading && (
                    <div className="text-center py-8 text-sm text-gray-400">Loading files…</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Pattern Config + Preview */}
            <div className="col-span-3 space-y-4">
              {/* Pattern Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Rename Pattern</CardTitle>
                  <CardDescription>Choose how to rename your files</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Type Selector */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {PATTERN_TYPES.map(({ type, label, icon: Icon, description }) => (
                      <button
                        key={type}
                        onClick={() => setPattern({ type })}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${pattern.type === type ? 'border-violet-400 bg-violet-50' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <Icon size={16} className={pattern.type === type ? 'text-violet-600' : 'text-gray-400'} />
                        <span className={`text-xs font-medium leading-tight text-center ${pattern.type === type ? 'text-violet-700' : 'text-gray-600'}`}>{label}</span>
                        <span className="text-[10px] text-gray-400 text-center leading-tight">{description}</span>
                      </button>
                    ))}
                  </div>

                  {/* Pattern Options */}
                  <div className="space-y-3">
                    {pattern.type === 'sequential' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Base Name</label>
                            <input
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none"
                              placeholder="e.g. movie"
                              value={pattern.prefix}
                              onChange={(e) => setPattern({ prefix: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Start From</label>
                            <input
                              type="number"
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                              value={pattern.startIndex}
                              min={0}
                              onChange={(e) => setPattern({ startIndex: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Separator</label>
                          <div className="flex gap-2">
                            {['_', '-', '.', ''].map((sep) => (
                              <button
                                key={sep}
                                onClick={() => setPattern({ separator: sep })}
                                className={`px-3 py-1.5 rounded-lg text-sm border-2 cursor-pointer ${pattern.separator === sep ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                              >
                                {sep === '' ? 'none' : `"${sep}"`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Preview: <span className="font-medium text-gray-700">{pattern.prefix || 'file'}{pattern.separator}{pattern.startIndex}.ext</span></p>
                        </div>
                      </>
                    )}

                    {pattern.type === 'prefix' && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Prefix to Add</label>
                        <input
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                          placeholder="e.g. 2024_"
                          value={pattern.prefix}
                          onChange={(e) => setPattern({ prefix: e.target.value })}
                        />
                      </div>
                    )}

                    {pattern.type === 'suffix' && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Suffix to Add</label>
                        <input
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                          placeholder="e.g. _backup"
                          value={pattern.suffix}
                          onChange={(e) => setPattern({ suffix: e.target.value })}
                        />
                      </div>
                    )}

                    {pattern.type === 'replace' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Find Text</label>
                          <input
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                            placeholder="Text to find"
                            value={pattern.find}
                            onChange={(e) => setPattern({ find: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Replace With</label>
                          <input
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                            placeholder="Replacement"
                            value={pattern.replaceWith}
                            onChange={(e) => setPattern({ replaceWith: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {pattern.type === 'date' && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Date Format</label>
                        <div className="flex flex-wrap gap-2">
                          {['YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY_MM_DD'].map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => setPattern({ dateFormat: fmt })}
                              className={`px-3 py-1.5 rounded-lg text-xs border-2 cursor-pointer ${pattern.dateFormat === fmt ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extension handling */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Extension Case</label>
                      <div className="flex gap-2">
                        {(['keep', 'lowercase', 'uppercase'] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setPattern({ extension: opt })}
                            className={`px-3 py-1.5 rounded-lg text-xs border-2 cursor-pointer capitalize ${pattern.extension === opt ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Table */}
              {preview.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Preview ({preview.length} renames)</CardTitle>
                        {conflictCount > 0 && (
                          <Badge variant="destructive">
                            <XCircle size={12} className="mr-1" />
                            {conflictCount} conflicts
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-x-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-100">
                          <span>Original Name</span>
                          <span>New Name</span>
                          <span>Status</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                          {preview.map((item, i) => (
                            <div
                              key={i}
                              className={`grid grid-cols-[1fr_1fr_auto] items-center gap-x-2 px-3 py-2 text-xs ${item.conflict ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                            >
                              <span className="truncate text-gray-600">{item.oldName}</span>
                              <span className={`truncate font-medium ${item.conflict ? 'text-red-600' : 'text-violet-600'}`}>
                                {item.newName}
                              </span>
                              {item.conflict ? (
                                <XCircle size={14} className="text-red-400" />
                              ) : (
                                <CheckCircle2 size={14} className="text-green-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
        <Button
          onClick={handleExecute}
          disabled={preview.length === 0 || isExecuting || conflictCount > 0}
          id="renamer-execute-btn"
        >
          <Play size={16} />
          {isExecuting ? 'Renaming…' : `Rename ${preview.length > 0 ? preview.length + ' Files' : ''}`}
        </Button>
        {conflictCount > 0 && (
          <p className="text-xs text-red-500">
            <AlertCircle size={12} className="inline mr-1" />
            Resolve {conflictCount} conflict(s) before renaming
          </p>
        )}
        {selectedCount === 0 && files.length > 0 && (
          <p className="text-xs text-gray-400">Select files to preview rename changes</p>
        )}
      </div>
    </div>
  )
}
