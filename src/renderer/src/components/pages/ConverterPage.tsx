import React, { useEffect } from 'react'
import { FolderOpen, Play, Eye, FileVideo, Settings2, XCircle } from 'lucide-react'
import { useConverterStore } from '../../store/useConverterStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { FilePreviewList, PreviewListItem } from '../shared/FilePreviewList'

export function ConverterPage(): React.JSX.Element {
  const {
    selectedFiles,
    jobs,
    preset,
    isLoading,
    error,
    setSelectedFiles,
    setPreset,
    enqueueConversion,
    cancelConversion,
    initProgressListener,
    reset
  } = useConverterStore()

  useEffect(() => {
    return () => reset()
  }, [reset])

  useEffect(() => {
    initProgressListener()
    // default preset
    if (!preset) {
      setPreset({
        id: 'web-balanced',
        name: 'Web (Balanced MP4)',
        targetContainer: 'mp4',
        ffmpegArgs: ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k']
      })
    }
  }, [initProgressListener, preset, setPreset])

  const handleSelectFiles = async (): Promise<void> => {
    // Usually we would allow multiple file selection, but MVP uses a mock or single file via generic IPC.
    // Assuming openDirectory or openFile for MVP:
    const dir = await window.api.openDirectory()
    if (dir) {
      const res = await window.fileflow.organizer.listFolder(dir)
      if (res.ok && res.data) {
        // filter media files
        const media = res.data.filter((f: any) => ['.mp4', '.mkv', '.avi', '.mov'].includes(f.ext.toLowerCase()))
        setSelectedFiles(media.map((f: any) => f.path))
      }
    }
  }

  // Convert map of jobs into array
  const jobList = Object.values(jobs)

  // Map to shared preview list format
  // We show queued items (selectedFiles) that aren't yet jobs, and active jobs.
  const mappedPreviewItems: PreviewListItem[] = []
  
  // Pending selected
  selectedFiles.forEach((file, idx) => {
    // If it's not already in jobs
    const isJob = jobList.find(j => j.inputPath === file)
    if (!isJob) {
      mappedPreviewItems.push({
        id: `pending-${idx}`,
        originalName: file.split('/').pop() || '',
        newName: `Will convert to ${preset?.targetContainer || '...'}`,
        status: 'pending'
      })
    }
  })

  // Active/Completed Jobs
  jobList.forEach((job) => {
    mappedPreviewItems.push({
      id: job.id,
      originalName: job.inputPath.split('/').pop() || '',
      newName: `${job.inputPath.split('/').pop()?.split('.')[0]}_converted.${preset?.targetContainer || 'mp4'}`,
      status: job.status,
      progress: job.progress
    })
  })

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-6 pt-6 pb-4 border-b border-white/20 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">High-Speed Converter</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Batch convert video and audio across formats flawlessly.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex gap-6 overflow-hidden">
        {/* Left Column: Controls */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo size={16} className="text-blue-600" />
                Input Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={handleSelectFiles}
                className="w-full h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer"
              >
                <FolderOpen
                  size={24}
                  className="text-slate-400 group-hover:text-blue-500 transition-colors"
                />
                {selectedFiles.length > 0 ? (
                  <div className="text-center px-2">
                    <p className="text-sm font-medium text-slate-700 truncate max-w-full">
                      {selectedFiles.length} files selected
                    </p>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-slate-500 group-hover:text-blue-600">
                    Select Folder (Extracts Media)
                  </span>
                )}
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 size={16} className="text-slate-600" />
                Output Preset
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button 
                variant={preset?.id === 'web-balanced' ? 'default' : 'outline'} 
                className="w-full justify-start"
                onClick={() => setPreset({
                  id: 'web-balanced', name: 'Web (Balanced MP4)', targetContainer: 'mp4', ffmpegArgs: ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k']
                })}
              >
                Web Balanced (MP4)
              </Button>
              <Button 
                variant={preset?.id === 'archive-h265' ? 'default' : 'outline'} 
                className="w-full justify-start"
                onClick={() => setPreset({
                  id: 'archive-h265', name: 'Archive (H.265 MKV)', targetContainer: 'mkv', ffmpegArgs: ['-c:v', 'libx265', '-crf', '28', '-preset', 'slow', '-c:a', 'copy']
                })}
              >
                Archive (H.265 MKV)
              </Button>
              <Button 
                variant={preset?.id === 'audio-mp3' ? 'default' : 'outline'} 
                className="w-full justify-start"
                onClick={() => setPreset({
                  id: 'audio-mp3', name: 'Audio Only (MP3)', targetContainer: 'mp3', ffmpegArgs: ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k']
                })}
              >
                Extract Audio (MP3)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview & Action */}
        <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md border border-white/40 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-transparent flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Eye size={16} />
              Conversion Queue
            </h3>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => {
                jobList.filter(j => j.status === 'processing' || j.status === 'pending').forEach(j => cancelConversion(j.id))
              }} disabled={jobList.length === 0}>
                <XCircle size={14} className="mr-2" />
                Cancel All
              </Button>
              <Button size="sm" onClick={() => enqueueConversion()} disabled={selectedFiles.length === 0 || isLoading}>
                <Play size={14} className="mr-2" />
                Start Conversion
              </Button>
            </div>
          </div>
          
          <div className="flex-1 p-4 flex flex-col min-h-0 relative">
            {error && (
              <div className="absolute inset-0 bg-white/40/80 z-10 flex items-center justify-center">
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 shadow-sm max-w-md text-center">
                  <p className="font-semibold">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
            
            <FilePreviewList items={mappedPreviewItems} />
          </div>
        </div>
      </div>
    </div>
  )
}
