import { useEffect } from 'react'
import {
  FolderOpen, Plus, Play, X, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConverterStore } from '../../store/converterStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Progress } from '../ui/Progress'
import { CONVERT_FORMAT_GROUPS } from '../../lib/constants'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-gray-400', bg: 'bg-gray-50' },
  converting: { label: 'Converting…', color: 'text-blue-600', bg: 'bg-blue-50' },
  done: { label: 'Done', color: 'text-green-600', bg: 'bg-green-50' },
  error: { label: 'Error', color: 'text-red-600', bg: 'bg-red-50' }
}

export function ConverterPage(): React.JSX.Element {
  const {
    ffmpegAvailable, jobs, outputDir, videoQuality, audioQuality,
    setFFmpegStatus, addJobs, removeJob, updateJob, setOutputDir,
    setVideoQuality, setAudioQuality, clearCompleted, clearAll
  } = useConverterStore()

  // Check ffmpeg on mount
  useEffect(() => {
    window.api.converter.checkFFmpeg().then((res) => {
      setFFmpegStatus(res.available, res.path)
    })
  }, [setFFmpegStatus])

  // Listen for progress
  useEffect(() => {
    const cleanup = window.api.converter.onProgress((data: unknown) => {
      const { progress, inputPath } = data as { progress: number; inputPath: string }
      const job = useConverterStore.getState().jobs.find((j) => j.inputPath === inputPath)
      if (job) updateJob(job.id, { progress })
    })
    return cleanup
  }, [updateJob])

  const handleAddFiles = async (): Promise<void> => {
    const files = await window.api.openFiles()
    if (files.length === 0) return
    const targetFormat = 'mp4'
    addJobs(files.map((p) => ({ inputPath: p, outputFormat: targetFormat })))
  }

  const handleSelectOutputDir = async (): Promise<void> => {
    const dir = await window.api.openDirectory()
    if (dir) setOutputDir(dir)
  }

  const handleConvertAll = async (): Promise<void> => {
    const pending = jobs.filter((j) => j.status === 'pending')
    if (!outputDir) {
      alert('Please select an output folder first.')
      return
    }
    for (const job of pending) {
      updateJob(job.id, { status: 'converting', progress: 0 })
      const res = await window.api.converter.convert({
        inputPath: job.inputPath,
        outputFormat: job.outputFormat,
        outputDir: outputDir,
        videoQuality: job.videoQuality,
        audioQuality: job.audioQuality
      })
      if (res.success) {
        updateJob(job.id, { status: 'done', progress: 100, outputPath: res.outputPath })
      } else {
        updateJob(job.id, { status: 'error', error: res.error })
      }
    }
  }

  const allFormats = [
    ...CONVERT_FORMAT_GROUPS.video.formats,
    ...CONVERT_FORMAT_GROUPS.audio.formats
  ]

  const pendingCount = jobs.filter((j) => j.status === 'pending').length
  const doneCount = jobs.filter((j) => j.status === 'done').length
  const errorCount = jobs.filter((j) => j.status === 'error').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">File Converter</h2>
            <p className="text-sm text-gray-500 mt-0.5">Convert video and audio to different formats using ffmpeg</p>
          </div>
          {jobs.length > 0 && (
            <div className="flex gap-2">
              {(doneCount > 0 || errorCount > 0) && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-gray-400">
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* FFmpeg Status */}
          {ffmpegAvailable === false && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl p-4 border border-amber-200 bg-amber-50 flex items-start gap-3"
            >
              <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">ffmpeg not found</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Install ffmpeg to enable conversion:
                </p>
                <code className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded mt-1 inline-block">
                  brew install ffmpeg
                </code>
                <span className="text-xs text-amber-700 ml-2">(macOS)</span>
                <code className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded mt-1 ml-2 inline-block">
                  winget install ffmpeg
                </code>
                <span className="text-xs text-amber-700 ml-2">(Windows)</span>
              </div>
            </motion.div>
          )}

          {ffmpegAvailable === true && (
            <div className="rounded-xl p-3 border border-green-200 bg-green-50 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <p className="text-sm text-green-700 font-medium">ffmpeg is installed and ready</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-5">
            {/* Settings Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Output Folder</CardTitle>
                  <CardDescription>Where to save converted files</CardDescription>
                </CardHeader>
                <CardContent>
                  <button
                    onClick={handleSelectOutputDir}
                    className="w-full flex items-center gap-2 p-3 border border-dashed border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all group cursor-pointer"
                  >
                    <FolderOpen size={16} className="text-gray-400 group-hover:text-emerald-500" />
                    <span className="text-sm text-gray-500 group-hover:text-emerald-600 truncate">
                      {outputDir ? outputDir.split('/').pop() : 'Select output folder'}
                    </span>
                  </button>
                  {outputDir && (
                    <p className="text-xs text-gray-400 mt-1.5 truncate">{outputDir}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">🎬 Video Quality</label>
                    <div className="space-y-1">
                      {(['high', 'medium', 'low'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setVideoQuality(q)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all ${videoQuality === q ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                        >
                          <span className="capitalize">{q}</span>
                          <span className="text-xs text-gray-400">
                            {q === 'high' ? 'CRF 23' : q === 'medium' ? 'CRF 28' : 'CRF 35'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">🎵 Audio Quality</label>
                    <div className="space-y-1">
                      {(['high', 'medium', 'low'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setAudioQuality(q)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all ${audioQuality === q ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                        >
                          <span className="capitalize">{q}</span>
                          <span className="text-xs text-gray-400">
                            {q === 'high' ? '320kbps' : q === 'medium' ? '192kbps' : '128kbps'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Job Queue */}
            <div className="col-span-2 space-y-4">
              {/* Add Files */}
              <Card>
                <CardContent className="pt-5">
                  <button
                    onClick={handleAddFiles}
                    disabled={ffmpegAvailable === false}
                    className="w-full h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:border-emerald-300 hover:bg-emerald-50 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    id="converter-add-files-btn"
                  >
                    <Plus size={20} className="text-gray-300 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-sm text-gray-400 group-hover:text-emerald-500">
                      Add files to convert
                    </span>
                  </button>
                </CardContent>
              </Card>

              {/* Job List */}
              {jobs.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Conversion Queue ({jobs.length})</CardTitle>
                      <div className="flex gap-2">
                        {doneCount > 0 && <Badge variant="success">{doneCount} done</Badge>}
                        {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
                        {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <AnimatePresence>
                        {jobs.map((job) => {
                          const status = STATUS_CONFIG[job.status]
                          return (
                            <motion.div
                              key={job.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className={`rounded-xl border border-gray-100 p-3 ${status.bg}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-800 truncate">{job.inputName}</p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-xs text-gray-400">.{job.inputPath.split('.').pop()}</span>
                                      <RefreshCw size={10} className="text-gray-300" />
                                      {/* Output format selector */}
                                      <div className="relative">
                                        <select
                                          value={job.outputFormat}
                                          onChange={(e) => updateJob(job.id, { outputFormat: e.target.value })}
                                          disabled={job.status !== 'pending'}
                                          className="text-xs text-emerald-600 font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-3"
                                        >
                                          {allFormats.map((f) => (
                                            <option key={f} value={f}>.{f}</option>
                                          ))}
                                        </select>
                                        <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                                      </div>
                                    </div>
                                  </div>

                                  {job.status === 'converting' && (
                                    <Progress value={job.progress} max={100} color="green" className="mt-1.5" />
                                  )}
                                  {job.status === 'error' && (
                                    <p className="text-xs text-red-600 mt-1 truncate">{job.error}</p>
                                  )}
                                  {job.status === 'done' && job.outputPath && (
                                    <p className="text-xs text-green-600 mt-1 truncate">→ {job.outputPath}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                                  {job.status === 'converting' && (
                                    <span className="text-xs text-gray-500">{job.progress}%</span>
                                  )}
                                  {job.status === 'done' && <CheckCircle2 size={16} className="text-green-500" />}
                                  {job.status === 'error' && <XCircle size={16} className="text-red-500" />}
                                  <button
                                    onClick={() => removeJob(job.id)}
                                    disabled={job.status === 'converting'}
                                    className="text-gray-300 hover:text-gray-500 disabled:opacity-30 cursor-pointer"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              )}

              {jobs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No files added yet</p>
                  <p className="text-xs mt-1">Add files above to start converting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
        <Button
          onClick={handleConvertAll}
          disabled={pendingCount === 0 || !outputDir || ffmpegAvailable === false}
          className="bg-emerald-600 hover:bg-emerald-700"
          id="converter-start-btn"
        >
          <Play size={16} />
          Convert {pendingCount > 0 ? `${pendingCount} File${pendingCount > 1 ? 's' : ''}` : ''}
        </Button>
        {!outputDir && jobs.length > 0 && (
          <p className="text-xs text-amber-600">
            <AlertTriangle size={12} className="inline mr-1" />
            Select an output folder to start
          </p>
        )}
        {ffmpegAvailable === null && (
          <p className="text-xs text-gray-400">Checking for ffmpeg…</p>
        )}
      </div>
    </div>
  )
}
