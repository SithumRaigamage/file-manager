import React, { useEffect } from 'react'
import { Folder, FileSearch, XCircle, RefreshCw, BarChart, Table, FileText } from 'lucide-react'
import { useMp4AnalyzerStore } from '../../store/mp4AnalyzerStore'
import { SummaryCards } from '../mp4analyzer/SummaryCards'
import { ResultsTable } from '../mp4analyzer/ResultsTable'
import { ChartsPanel } from '../mp4analyzer/ChartsPanel'
import { ReportPanel } from '../mp4analyzer/ReportPanel'
import { FileDetailDrawer } from '../mp4analyzer/FileDetailDrawer'
import { cn } from '../../lib/utils'

export function Mp4AnalyzerPage(): React.JSX.Element {
  const {
    results,
    summary,
    scanState,
    progress,
    activeTab,
    selectedFile,
    setResults,
    addResult,
    setScanState,
    setProgress,
    setActiveTab,
    setSelectedFile,
    resetStore
  } = useMp4AnalyzerStore()

  // Subscribe to progress events from the main process
  useEffect(() => {
    const unsubscribe = window.api.mp4analyzer.onProgress((data) => {
      setProgress(data)
      if (data.result) {
        addResult(data.result)
      }
    })
    return () => unsubscribe()
  }, [setProgress, addResult])

  const handleSelectFile = async () => {
    try {
      const filePaths = await window.api.openFiles()
      if (filePaths.length === 0) return

      resetStore()
      setScanState('scanning')
      setProgress({ scanned: 0, total: 1, currentFile: filePaths[0] })

      const result = await window.api.mp4analyzer.analyzeFile(filePaths[0])
      addResult(result)
      setScanState('done')
    } catch (err) {
      console.error(err)
      setScanState('idle')
    }
  }

  const handleSelectFolder = async () => {
    try {
      const folderPath = await window.api.openDirectory()
      if (!folderPath) return

      resetStore()
      setScanState('scanning')
      setProgress({ scanned: 0, total: 1, currentFile: 'Scanning folder...' })

      const scanResults = await window.api.mp4analyzer.analyzeFolder(folderPath)
      setResults(scanResults)
      setScanState('done')
    } catch (err) {
      console.error(err)
      setScanState('idle')
    }
  }

  const handleCancel = async () => {
    await window.api.mp4analyzer.cancel()
    setScanState('cancelled')
  }

  const overallProgressPercent = progress.total > 0
    ? Math.round((progress.scanned / progress.total) * 100)
    : 0

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6 bg-gray-50/20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">MP4 Integrity Analyzer</h1>
          <p className="text-xs text-gray-400 mt-1">
            Scan and diagnose H.264/HEVC container structures, track boxes, and decodability integrity.
          </p>
        </div>

        {/* Scan Actions */}
        <div className="flex items-center gap-3">
          {scanState === 'scanning' ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:bg-rose-200"
            >
              <XCircle size={15} />
              Cancel Scan
            </button>
          ) : (
            <>
              <button
                onClick={handleSelectFile}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:bg-gray-100"
              >
                <FileSearch size={15} className="text-gray-500" />
                Select File
              </button>
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-md"
              >
                <Folder size={15} />
                Scan Directory
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {scanState === 'scanning' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-400 truncate max-w-xs">
              Analyzing: <strong className="text-gray-700 font-bold">{progress.currentFile}</strong>
            </span>
            <span className="text-blue-600 font-bold">{overallProgressPercent}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${overallProgressPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Progress: {Math.floor(progress.scanned)} / {progress.total} files</span>
            {progress.total > 1 && (
              <span className="animate-pulse flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" /> Batch scan in progress...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats Row */}
      {results.length > 0 && <SummaryCards summary={summary} />}

      {/* Tabs navigation */}
      {results.length > 0 && (
        <div className="border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('table')}
              className={cn(
                'pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'table'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              <Table size={14} />
              Files Table
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={cn(
                'pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'charts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              <BarChart size={14} />
              Visual Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={cn(
                'pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'report'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              <FileText size={14} />
              Export Reports
            </button>
          </div>

          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest pb-3">
            v1.0.3 • diagnostics engine
          </span>
        </div>
      )}

      {/* Main Tab Panel Container */}
      <div className="flex-1 min-h-0 flex flex-col">
        {results.length === 0 && scanState !== 'scanning' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
              <FileSearch size={26} className="stroke-[2.2]" />
            </div>
            <h2 className="text-base font-bold text-gray-800">Start Video Diagnostics</h2>
            <p className="text-xs text-gray-400 mt-1.5 max-w-sm leading-relaxed">
              Scan individual files or entire folders to analyze codec information, track structure hierarchy, and test frame playback decodability.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSelectFile}
                className="px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs cursor-pointer shadow-xs active:bg-gray-100 transition-all flex items-center gap-1.5"
              >
                Choose file
              </button>
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                Scan folder
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'table' && <ResultsTable results={results} onSelectFile={setSelectedFile} />}
            {activeTab === 'charts' && <ChartsPanel results={results} />}
            {activeTab === 'report' && <ReportPanel results={results} summary={summary} />}
          </>
        )}
      </div>

      {/* Drawer Details Component */}
      <FileDetailDrawer
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onRepairSuccess={(newResult) => {
          addResult(newResult)
          setSelectedFile(newResult)
        }}
      />
    </div>
  )
}
