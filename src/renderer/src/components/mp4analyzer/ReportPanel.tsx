import React, { useState } from 'react'
import { FileText, Download, CheckCircle, AlertCircle, FileSpreadsheet, Braces } from 'lucide-react'
import { Mp4FileResult, Mp4AnalyzerSummary } from '../../types/mp4analyzer'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

interface ReportPanelProps {
  results: Mp4FileResult[]
  summary: Mp4AnalyzerSummary
}

export function ReportPanel({ results, summary }: ReportPanelProps): React.JSX.Element {
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExportCsv = async () => {
    setExporting('csv')
    try {
      await window.api.mp4analyzer.exportCsv(results)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  const handleExportJson = async () => {
    setExporting('json')
    try {
      await window.api.mp4analyzer.exportJson(results)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = () => {
    setExporting('pdf')
    try {
      const doc = new jsPDF()

      // Header block
      doc.setFillColor(30, 41, 59) // Dark Slate
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('FileFlow Diagnostics', 14, 18)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('MP4 Integrity & Playability Diagnostics Report', 14, 25)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)

      // Summary Header
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Diagnostics Summary', 14, 55)

      // Summary table
      const summaryHeaders = [['Metric', 'Count', 'Percentage']]
      const summaryRows = [
        ['Total Scanned Files', summary.totalFiles.toString(), '100%'],
        ['Healthy Videos', summary.healthyFiles.toString(), `${summary.totalFiles > 0 ? Math.round((summary.healthyFiles / summary.totalFiles) * 100) : 0}%`],
        ['Corrupted Videos', summary.corruptedFiles.toString(), `${summary.totalFiles > 0 ? Math.round((summary.corruptedFiles / summary.totalFiles) * 100) : 0}%`],
        ['Repairable Videos', summary.repairableFiles.toString(), `${summary.totalFiles > 0 ? Math.round((summary.repairableFiles / summary.totalFiles) * 100) : 0}%`],
        ['Unrecoverable Videos', summary.unrecoverableFiles.toString(), `${summary.totalFiles > 0 ? Math.round((summary.unrecoverableFiles / summary.totalFiles) * 100) : 0}%`]
      ]

      ;(doc as any).autoTable({
        startY: 60,
        head: summaryHeaders,
        body: summaryRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // blue
        styles: { fontSize: 10 }
      })

      // Detailed file breakdown header
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Detailed Video Breakdown', 14, (doc as any).lastAutoTable.finalY + 15)

      const fileHeaders = [['File Name', 'Size', 'Duration', 'State', 'Health %', 'Errors', 'Action Recommendation']]
      const fileRows = results.map((r) => {
        const sizeMB = (r.fileSize / (1024 * 1024)).toFixed(2) + ' MB'
        const duration = r.metadata?.duration ? Math.round(r.metadata.duration) + 's' : 'N/A'
        const health = (r.playbackVerification?.healthScore ?? 100) + '%'
        const errors = r.ffmpegValidation.errorCount
        return [
          r.fileName,
          sizeMB,
          duration,
          r.corruptionLevel,
          health,
          errors.toString(),
          r.recommendation.action
        ]
      })

      ;(doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 22,
        head: fileHeaders,
        body: fileRows,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // indigo
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 15 },
          2: { cellWidth: 15 },
          3: { cellWidth: 20 },
          4: { cellWidth: 15 },
          5: { cellWidth: 15 },
          6: { cellWidth: 'auto' }
        }
      })

      doc.save('mp4_integrity_report.pdf')
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl p-10 py-24 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
          <FileText size={24} />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">No report generated</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Report generators compile aggregate summaries after diagnostics scans are run.
        </p>
      </div>
    )
  }

  const overallHealth = summary.totalFiles > 0
    ? Math.round((summary.healthyFiles / summary.totalFiles) * 100)
    : 100

  return (
    <div className="flex-1 overflow-auto space-y-6 pr-1">
      {/* Report overview */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs grid grid-cols-3 gap-8 items-center">
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            {overallHealth >= 90 ? (
              <CheckCircle size={20} className="text-emerald-500 stroke-[2.2]" />
            ) : (
              <AlertCircle size={20} className="text-amber-500 stroke-[2.2]" />
            )}
            <h3 className="text-base font-bold text-gray-800">Diagnostics Report Summary</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Diagnosed <strong className="text-gray-700">{summary.totalFiles}</strong> video tracks.
            Overall library health is <strong className="text-gray-700">{overallHealth}%</strong>.
            {summary.corruptedFiles > 0
              ? ` Found ${summary.corruptedFiles} tracks with corruption markers. ${summary.repairableFiles} can be recovered with ffmpeg rebuilds.`
              : ' No issues or bad boxes found in the files.'}
          </p>
        </div>

        {/* Big Health Score Badge */}
        <div className="flex flex-col items-center justify-center border-l border-gray-100 h-full py-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Library Health</span>
          <span className={`text-4xl font-black mt-1 ${overallHealth >= 90 ? 'text-emerald-500' : overallHealth >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
            {overallHealth}%
          </span>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-3 gap-6">
        {/* CSV Exporter */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">Export CSV Spreadsheet</h4>
            <p className="text-xs text-gray-400 mt-1 px-4 leading-relaxed">
              Standard tabular data sheet containing resolution, byte counts, and repair commands.
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exporting !== null}
            className="w-full py-2 border border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 transition-all font-semibold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download size={14} />
            {exporting === 'csv' ? 'Exporting...' : 'Save CSV Report'}
          </button>
        </div>

        {/* JSON Exporter */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Braces size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">Export JSON Payload</h4>
            <p className="text-xs text-gray-400 mt-1 px-4 leading-relaxed">
              Raw structural data representation including the parsed atom tree arrays.
            </p>
          </div>
          <button
            onClick={handleExportJson}
            disabled={exporting !== null}
            className="w-full py-2 border border-blue-250 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-all font-semibold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download size={14} />
            {exporting === 'json' ? 'Exporting...' : 'Save JSON Report'}
          </button>
        </div>

        {/* PDF Exporter */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">Export PDF Document</h4>
            <p className="text-xs text-gray-400 mt-1 px-4 leading-relaxed">
              Sleek printable document with summary tables, metadata grids, and detailed recommendations.
            </p>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="w-full py-2 border border-indigo-250 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition-all font-semibold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download size={14} />
            {exporting === 'pdf' ? 'Generating...' : 'Save PDF Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
