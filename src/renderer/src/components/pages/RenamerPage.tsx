import React, { useState, useEffect } from 'react'
import { FolderOpen, Play, Eye, FolderInput } from 'lucide-react'
import { useRenamerStore } from '../../store/useRenamerStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { FilePreviewList, PreviewListItem } from '../shared/FilePreviewList'

export function RenamerPage(): React.JSX.Element {
  const {
    currentFolder,
    selectedFiles,
    pattern,
    previewItems,
    isLoading,
    error,
    setFolder,
    setSelectedFiles,
    updatePattern,
    applyRename,
    reset
  } = useRenamerStore()

  useEffect(() => {
    return () => reset()
  }, [reset])

  const [localPrefix, setLocalPrefix] = useState('')
  const [localSuffix, setLocalSuffix] = useState('')
  const [localFind, setLocalFind] = useState('')
  const [localReplace, setLocalReplace] = useState('')

  const handleSelectDirectory = async (): Promise<void> => {
    const dir = await window.api.openDirectory()
    if (dir) {
      setFolder(dir)
      // fetch files for this directory
      const res = await window.fileflow.organizer.listFolder(dir)
      if (res.ok && res.data) {
        setSelectedFiles(res.data.map((f: any) => f.path))
      }
    }
  }

  const applySteps = () => {
    const steps: any[] = []
    if (localFind) steps.push({ type: 'find_replace', find: localFind, replace: localReplace })
    if (localPrefix || localSuffix) steps.push({ type: 'prefix_suffix', prefix: localPrefix, suffix: localSuffix })
    
    updatePattern({ ...pattern, steps })
  }

  const mappedPreviewItems: PreviewListItem[] = previewItems.map((item, idx) => ({
    id: String(idx),
    originalName: item.originalPath.split('/').pop() || '',
    newName: item.newName,
    conflict: item.conflict
  }))

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-6 pt-6 pb-4 border-b border-white/20 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Professional Bulk Renamer</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Rename thousands of files instantly with powerful patterns.
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
                      {selectedFiles.length} files selected
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
              <CardTitle>Rename Steps</CardTitle>
              <CardDescription>Configure how files should be renamed</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Find & Replace</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Find..." 
                    className="w-full text-sm px-3 py-2 border rounded-md"
                    value={localFind}
                    onChange={e => setLocalFind(e.target.value)}
                    onBlur={applySteps}
                  />
                  <input 
                    type="text" 
                    placeholder="Replace..." 
                    className="w-full text-sm px-3 py-2 border rounded-md"
                    value={localReplace}
                    onChange={e => setLocalReplace(e.target.value)}
                    onBlur={applySteps}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Prefix & Suffix</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Prefix..." 
                    className="w-full text-sm px-3 py-2 border rounded-md"
                    value={localPrefix}
                    onChange={e => setLocalPrefix(e.target.value)}
                    onBlur={applySteps}
                  />
                  <input 
                    type="text" 
                    placeholder="Suffix..." 
                    className="w-full text-sm px-3 py-2 border rounded-md"
                    value={localSuffix}
                    onChange={e => setLocalSuffix(e.target.value)}
                    onBlur={applySteps}
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview & Action */}
        <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md border border-white/40 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-transparent flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Eye size={16} />
              Rename Preview
            </h3>
            <Button size="sm" onClick={() => applyRename()} disabled={previewItems.length === 0 || isLoading}>
              <Play size={14} className="mr-2" />
              Execute Rename
            </Button>
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
