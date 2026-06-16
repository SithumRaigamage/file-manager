import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Info, AlertTriangle, ShieldCheck, Terminal, Layers, PlayCircle, Code2, Hammer, Loader2, Sparkles, FolderOpen, Trash2 } from 'lucide-react'
import { Mp4FileResult, CorruptionLevel } from '../../types/mp4analyzer'
import { Badge } from '../ui/Badge'
import { useMp4AnalyzerStore } from '../../store/mp4AnalyzerStore'

interface FileDetailDrawerProps {
  file: Mp4FileResult | null
  onClose: () => void
  onRepairSuccess?: (newResult: Mp4FileResult) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(secs: number): string {
  if (!secs || isNaN(secs)) return 'N/A'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  const mStr = m.toString().padStart(2, '0')
  const sStr = s.toString().padStart(2, '0')
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${mStr}:${sStr}`
  }
  return `${mStr}:${sStr}`
}

export function FileDetailDrawer({ file, onClose, onRepairSuccess }: FileDetailDrawerProps): React.JSX.Element {
  const { removeResult, removeFolderResults } = useMp4AnalyzerStore()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'player' | 'structure' | 'logs'>('diagnostics')
  
  // Repair execution state
  const [repairStatus, setRepairStatus] = useState<'idle' | 'repairing' | 'success' | 'error'>('idle')
  const [repairProgress, setRepairProgress] = useState(0)
  const [repairError, setRepairError] = useState<string | null>(null)
  const [repairedPath, setRepairedPath] = useState<string | null>(null)

  // Listen for repair progress
  useEffect(() => {
    if (repairStatus === 'repairing') {
      const unsubscribe = window.api.mp4analyzer.onRepairProgress((data) => {
        if (file && data.filePath === file.filePath) {
          setRepairProgress(data.progress)
        }
      })
      return () => unsubscribe()
    }
    return undefined
  }, [repairStatus, file])

  // Reset repair states when file changes
  useEffect(() => {
    setRepairStatus('idle')
    setRepairProgress(0)
    setRepairError(null)
    setRepairedPath(null)
    setActiveTab('diagnostics')
  }, [file])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunRepair = async () => {
    if (!file || !file.recommendation.command) return
    setRepairStatus('repairing')
    setRepairProgress(10)
    setRepairError(null)

    try {
      const res = await window.api.mp4analyzer.runRepair(file.filePath, file.recommendation.command)
      if (res.success) {
        setRepairStatus('success')
        setRepairProgress(100)
        setRepairedPath(res.repairedPath)

        // Automatically analyze the newly repaired file after a brief delay
        setTimeout(async () => {
          if (onRepairSuccess) {
            try {
              const newFileResult = await window.api.mp4analyzer.analyzeFile(res.repairedPath)
              onRepairSuccess(newFileResult)
            } catch (err) {
              console.error('Failed to auto-analyze repaired file:', err)
            }
          }
        }, 1500)
      } else {
        setRepairStatus('error')
        setRepairError(res.error || 'Repair process exited with error code.')
      }
    } catch (err) {
      setRepairStatus('error')
      setRepairError((err as Error).message)
    }
  }

  const getCorruptionColor = (level: CorruptionLevel) => {
    switch (level) {
      case 'healthy': return 'success' as const
      case 'minor': return 'warning' as const
      case 'moderate': return 'warning' as const
      case 'severe': return 'destructive' as const
      case 'unrecoverable': return 'destructive' as const
      default: return 'secondary' as const
    }
  }

  const getConfidenceColor = (conf: 'high' | 'medium' | 'low') => {
    switch (conf) {
      case 'high': return 'bg-emerald-50 text-emerald-700 border-emerald-250'
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-250'
      case 'low': return 'bg-rose-50 text-rose-700 border-rose-250'
    }
  }

  return (
    <AnimatePresence>
      {file && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900 z-50 cursor-pointer"
          />

          {/* Slide-out drawer sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 220 }}
            className="fixed top-0 right-0 w-[520px] h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="min-w-0 pr-4">
                <h2 className="text-base font-bold text-gray-900 truncate" title={file.fileName}>
                  {file.fileName}
                </h2>
                <p className="text-xs text-gray-400 truncate mt-0.5" title={file.filePath}>
                  {file.filePath}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => window.api.showItemInFolder(file.filePath)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer inline-flex items-center justify-center"
                  title="Open file location in Finder"
                >
                  <FolderOpen size={18} />
                </button>
                {file.corruptionLevel !== 'healthy' && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await window.api.mp4analyzer.deleteFile(file.filePath)
                        if (res.success) {
                          if (res.action === 'folder') {
                            removeFolderResults(res.folderPath)
                          } else if (res.action === 'file') {
                            removeResult(res.filePath)
                          }
                          onClose()
                        }
                      } catch (err) {
                        alert(`Failed to delete: ${(err as Error).message}`)
                      }
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-655 hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center"
                    title="Delete corrupted video file"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-all cursor-pointer inline-flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Sub-Header Tabs */}
            <div className="flex px-4 border-b border-gray-100 bg-gray-50/20 text-xs font-semibold text-gray-500">
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'diagnostics' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-gray-800'
                }`}
              >
                Diagnostics
              </button>
              <button
                onClick={() => setActiveTab('player')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'player' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-gray-800'
                }`}
              >
                Playback Test
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'structure' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-gray-800'
                }`}
              >
                Atom Structure
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'logs' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-gray-800'
                }`}
              >
                FFmpeg Frame Logs ({file.errorLogs?.length || 0})
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Tab 1: Diagnostics */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-6">
                  {/* Quick Status banner */}
                  <div className="flex items-center justify-between p-4 bg-gray-50/60 border border-gray-100 rounded-2xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase block">Status</span>
                      <Badge variant={getCorruptionColor(file.corruptionLevel)} className="mt-1 capitalize">
                        {file.corruptionLevel.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-gray-400 uppercase block">Health Score</span>
                      <span className="text-2xl font-black text-gray-800">
                        {file.playbackVerification?.healthScore ?? 100}%
                      </span>
                    </div>
                  </div>

                  {/* Error messages block */}
                  {file.errorMsg && (
                    <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-red-800 flex items-start gap-3">
                      <AlertTriangle size={18} className="shrink-0 stroke-[2] mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">Diagnostics Error</h4>
                        <p className="text-xs font-medium mt-1 leading-relaxed text-red-850">{file.errorMsg}</p>
                      </div>
                    </div>
                  )}

                  {/* Metadata Info Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Info size={14} className="stroke-[2.2]" /> File Metadata
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50/30 border border-gray-100 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">File size</span>
                        <span className="block text-sm font-semibold text-gray-800 mt-0.5">
                          {formatBytes(file.fileSize)}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50/30 border border-gray-100 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Duration</span>
                        <span className="block text-sm font-semibold text-gray-800 mt-0.5">
                          {formatDuration(file.metadata?.duration || 0)}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50/30 border border-gray-100 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Resolution</span>
                        <span className="block text-sm font-semibold text-gray-800 mt-0.5">
                          {file.metadata?.resolution || 'Unknown'}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50/30 border border-gray-100 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Frame rate</span>
                        <span className="block text-sm font-semibold text-gray-800 mt-0.5">
                          {file.metadata?.fps ? `${file.metadata.fps} FPS` : 'Unknown'}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50/30 border border-gray-100 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Video codec</span>
                        <span className="block text-sm font-semibold text-gray-800 mt-0.5 uppercase">
                          {file.metadata?.codec || 'None'}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50/30 border border-gray-100 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Audio codec</span>
                        <span className="block text-sm font-semibold text-gray-800 mt-0.5 uppercase">
                          {file.metadata?.audioCodec || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Playback Diagnostics */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <ShieldCheck size={14} className="stroke-[2.2]" /> Playability Scan
                    </h3>
                    <div className="p-4 bg-gray-50/30 border border-gray-100 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                        <span>Total frames analyzed:</span>
                        <span className="font-bold text-gray-800">{file.playbackVerification?.totalFrames ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                        <span>Decodable (playable) frames:</span>
                        <span className="font-bold text-emerald-600">{file.playbackVerification?.decodableFrames ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                        <span>Corrupted frames:</span>
                        <span className="font-bold text-rose-600">{file.playbackVerification?.corruptedFrames ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                        <span>Stream validation status:</span>
                        <span className="font-semibold text-gray-800">
                          {file.ffmpegValidation.errorCount} Errors, {file.ffmpegValidation.warningCount} Warnings
                    </span>
                      </div>
                    </div>
                  </div>

                  {/* Repair Recommendations */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Terminal size={14} className="stroke-[2.2]" /> Repair & Recovery Tools
                    </h3>
                    <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-2xl space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-xs text-gray-600 font-medium leading-relaxed">
                          {file.recommendation.action}
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${getConfidenceColor(file.recommendation.confidence)}`}>
                          {file.recommendation.confidence} Confidence
                        </span>
                      </div>

                      {file.recommendation.command && (
                        <div className="space-y-3">
                          <div className="relative">
                            <div className="bg-gray-900 rounded-xl p-3.5 pr-12 font-mono text-xs text-blue-400 break-all select-all leading-normal">
                              {file.recommendation.command}
                            </div>
                            <button
                              onClick={() => copyToClipboard(file.recommendation.command!)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all cursor-pointer flex items-center justify-center"
                              title="Copy repair command"
                            >
                              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                          </div>

                          {/* Action Executor Runner */}
                          <div className="pt-1">
                            {repairStatus === 'idle' && (
                              <button
                                onClick={handleRunRepair}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all"
                              >
                                <Hammer size={14} />
                                Run Repair Automatically
                              </button>
                            )}

                            {repairStatus === 'repairing' && (
                              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                                  <span className="flex items-center gap-1.5">
                                    <Loader2 size={13} className="animate-spin" />
                                    Executing FFmpeg Repair Pipeline...
                                  </span>
                                  <span>{repairProgress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                    style={{ width: `${repairProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {repairStatus === 'success' && (
                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-center text-xs font-semibold text-emerald-800 space-y-1 flex flex-col items-center">
                                <span className="flex items-center gap-1.5 text-emerald-900 font-bold text-sm">
                                  <Sparkles size={16} className="text-emerald-500 fill-emerald-500" />
                                  Repair Completed Successfully!
                                </span>
                                <span className="text-[10px] font-medium text-emerald-600 block mt-1 break-all">
                                  Repaired track written to: {repairedPath}
                                </span>
                                <span className="text-[10px] text-emerald-500/80 mt-1 block">
                                  Auto-scanning repaired track box structures...
                                </span>
                              </div>
                            )}

                            {repairStatus === 'error' && (
                              <div className="bg-red-50 border border-red-150 rounded-xl p-3.5 space-y-2 text-xs text-red-800">
                                <div className="font-bold text-red-900 flex items-center gap-1.5">
                                  <AlertTriangle size={14} className="stroke-[2.2]" />
                                  Automatic Repair Failed
                                </div>
                                <div className="font-mono text-[10px] bg-red-100/30 p-2 rounded-lg break-all">
                                  {repairError}
                                </div>
                                <button
                                  onClick={handleRunRepair}
                                  className="w-full py-1.5 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 font-semibold rounded-lg text-xs cursor-pointer transition-all"
                                >
                                  Retry Pipeline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Playback Test Player */}
              {activeTab === 'player' && (
                <div className="space-y-4">
                  {file.corruptionLevel === 'unrecoverable' ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center">
                      <ShieldCheck size={36} className="text-gray-400 mb-2 stroke-[1.5]" />
                      <h4 className="text-sm font-bold text-gray-700">Video Player Offline</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                        This video has severe atom structural damage and missing metadata blocks. It cannot be parsed by HTML5 decoders.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-900">
                        {/* Play custom media protocol */}
                        <video
                          src={`media://${file.filePath}`}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                        />
                      </div>
                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs leading-relaxed text-blue-800">
                        <div className="font-bold text-blue-900 flex items-center gap-1.5">
                          <PlayCircle size={14} /> Playback notice
                        </div>
                        <div>
                          Chromium decodes H.264 streams and AAC audio wrappers natively. If the video uses advanced formats (HEVC, H.265), compatibility depends on your hardware acceleration status.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Structure */}
              {activeTab === 'structure' && (
                <div className="space-y-4">
                  {file.atomStructure && file.atomStructure.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Layers size={14} className="stroke-[2.2]" /> Atom Box Hierarchy
                      </h3>
                      <div className="p-4 bg-gray-50/40 border border-gray-100 rounded-xl font-mono text-xs text-gray-600 max-h-[460px] overflow-y-auto space-y-1.5 scrollbar-thin">
                        {file.atomStructure.map((atomPath, index) => {
                          const parts = atomPath.split('/')
                          const indent = parts.length - 1
                          const name = parts[parts.length - 1]
                          return (
                            <div
                              key={`${atomPath}-${index}`}
                              style={{ paddingLeft: `${indent * 12}px` }}
                              className="flex items-center gap-1.5"
                            >
                              <span className="text-gray-300">└─</span>
                              <span className={`${indent === 0 ? 'font-bold text-blue-600' : 'text-gray-650'}`}>
                                {name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-10">
                      No structural boxes mapped.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Logs */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Code2 size={14} /> FFmpeg Diagnostics Output
                  </h3>
                  {file.errorLogs && file.errorLogs.length > 0 ? (
                    <div className="font-mono text-xs p-4 bg-gray-950 text-gray-300 rounded-xl space-y-2 max-h-[450px] overflow-y-auto border border-gray-900 scrollbar-thin">
                      {file.errorLogs.map((log, idx) => (
                        <div key={idx} className={log.startsWith('Error:') ? 'text-red-400' : 'text-yellow-500'}>
                          {log}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-emerald-600 bg-emerald-50/30 border border-emerald-100 rounded-xl font-semibold flex flex-col items-center gap-1">
                      <Sparkles size={20} className="text-emerald-500" />
                      Zero frame rendering warnings or decoding defects found.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center gap-3">
              <button
                onClick={() => window.api.showItemInFolder(file.filePath)}
                className="px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs cursor-pointer shadow-xs active:bg-emerald-200 transition-all flex items-center gap-1.5"
              >
                <FolderOpen size={14} />
                Open File Location
              </button>
              {file.corruptionLevel !== 'healthy' && (
                <button
                  onClick={async () => {
                    try {
                      const res = await window.api.mp4analyzer.deleteFile(file.filePath)
                      if (res.success) {
                        if (res.action === 'folder') {
                          removeFolderResults(res.folderPath)
                        } else if (res.action === 'file') {
                          removeResult(res.filePath)
                        }
                        onClose()
                      }
                    } catch (err) {
                      alert(`Failed to delete: ${(err as Error).message}`)
                    }
                  }}
                  className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs cursor-pointer shadow-xs active:bg-rose-200 transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Delete File
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-xs cursor-pointer shadow-xs active:bg-gray-100 transition-all"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
