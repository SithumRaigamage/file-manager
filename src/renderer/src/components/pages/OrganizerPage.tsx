import React from 'react'
import { FolderOpen, Play, Eye, FolderInput } from 'lucide-react'
import { useOrganizerStore } from '../../store/useOrganizerStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { FilePreviewList, PreviewListItem } from '../shared/FilePreviewList'

export function OrganizerPage(): React.JSX.Element {
  const {
    currentFolder,
    files,
    previewItems,
    isLoading,
    isWatching,
    error,
    loadFolder,
    previewQuickRule,
    applyOrganize,
    toggleWatch
  } = useOrganizerStore()

  const handleSelectDirectory = async (): Promise<void> => {
    const dir = await window.api.openDirectory()
    if (dir) {
      loadFolder(dir)
    }
  }

  const handlePreviewImages = () => previewQuickRule('images')
  const handlePreviewVideos = () => previewQuickRule('videos')
  const handlePreviewDocs = () => previewQuickRule('docs')
  
  const handleExecute = () => applyOrganize()

  // Map to shared preview list format
  const mappedPreviewItems: PreviewListItem[] = previewItems.map((item, idx) => ({
    id: String(idx),
    originalName: item.originalPath.split('/').pop() || '',
    newName: item.proposedDestination.split('/').pop() || '',
    action: item.action
  }))

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Smart File Organizer</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Automatically sort messy folders based on intelligent rules.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex gap-6 overflow-hidden">
        {/* Left Column: Controls */}
        <div className="w-80 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderInput size={16} className="text-blue-600" />
                Target Folder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={handleSelectDirectory}
                className="w-full h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer"
              >
                <FolderOpen
                  size={24}
                  className="text-slate-400 group-hover:text-blue-500 transition-colors"
                />
                {currentFolder ? (
                  <div className="text-center px-2">
                    <p className="text-xs font-medium text-slate-700 truncate max-w-full">
                      {currentFolder.split('/').pop()}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate max-w-full mt-1">
                      {files.length} files found
                    </p>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-slate-500 group-hover:text-blue-600">
                    Select Folder
                  </span>
                )}
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Rules</CardTitle>
              <CardDescription>Instant sorting presets</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-start" onClick={handlePreviewImages} disabled={!currentFolder || isLoading}>
                Sort Images
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handlePreviewVideos} disabled={!currentFolder || isLoading}>
                Sort Videos
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handlePreviewDocs} disabled={!currentFolder || isLoading}>
                Sort Documents
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-Pilot</CardTitle>
              <CardDescription>Watch folder in background</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant={isWatching ? "destructive" : "default"} 
                className="w-full" 
                onClick={() => toggleWatch({ id: 'dummy', name: 'Watching', type: 'quick', quickRuleId: 'images' })}
                disabled={!currentFolder || isLoading}
              >
                {isWatching ? 'Stop Watching' : 'Start Watching'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview & Action */}
        <div className="flex-1 flex flex-col bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Eye size={16} />
              Operation Preview
            </h3>
            <Button size="sm" onClick={handleExecute} disabled={previewItems.length === 0 || isLoading}>
              <Play size={14} className="mr-2" />
              Execute Organizing
            </Button>
          </div>
          
          <div className="flex-1 p-4 flex flex-col min-h-0 relative">
            {error && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
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
