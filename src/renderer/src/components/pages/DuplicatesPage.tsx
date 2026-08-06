import { useEffect, useState } from 'react';
import { useDuplicateStore } from '../../store/useDuplicateStore';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { FolderOpen, Layers, Check, Trash2, ShieldAlert } from 'lucide-react';

export function DuplicatesPage() {
  const { startScan, cancelScan, progress, isScanning, groups, error, fetchGroups, resolveGroup } = useDuplicateStore();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({}); // groupId -> path to KEEP

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSelectFolder = async () => {
    const dir = await window.api.openDirectory();
    if (dir) {
      setSelectedFolder(dir);
    }
  };

  const handleScan = () => {
    if (!selectedFolder) return;
    startScan(selectedFolder);
  };

  const handleResolve = async (groupId: string) => {
    const keepPath = selections[groupId];
    if (!keepPath) {
      alert('Select a file to keep');
      return;
    }
    
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const deletePaths = group.files.filter(f => f.path !== keepPath).map(f => f.path);
    
    try {
      await resolveGroup(groupId, keepPath, deletePaths);
      alert('Duplicates resolved successfully');
      setSelections(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    } catch (err) {
      alert(`Failed to resolve: ${(err as Error).message}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Duplicate Finder</h1>
          <p className="text-muted-foreground mt-1">
            Safely find and remove exact duplicate files using SHA-256 hashing.
          </p>
        </div>
      </div>

      <div className="p-6 shrink-0 flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Folder to Scan</label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSelectFolder} className="w-full justify-start text-left font-normal truncate">
              <FolderOpen className="w-4 h-4 mr-2 shrink-0" />
              <span className="truncate">{selectedFolder || 'Select a folder...'}</span>
            </Button>
          </div>
        </div>
        
        {isScanning ? (
          <Button variant="destructive" onClick={cancelScan}>Cancel Scan</Button>
        ) : (
          <Button onClick={handleScan} disabled={!selectedFolder}>
            <Layers className="w-4 h-4 mr-2" />
            Start Scan
          </Button>
        )}
      </div>

      {isScanning && (
        <div className="px-6 pb-6 shrink-0 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium capitalize text-primary">{progress.phase}</span>
                <span className="text-muted-foreground">
                  {progress.phase === 'scanning' ? `${progress.scannedCount} files found` : `${progress.hashedCount} / ${progress.totalToHash} files hashed`}
                </span>
              </div>
              <Progress value={progress.phase === 'scanning' ? 0 : (progress.totalToHash ? (progress.hashedCount / progress.totalToHash) * 100 : 100)} className="h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="px-6 pb-6 shrink-0">
          <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center">
            <ShieldAlert className="w-5 h-5 mr-3" />
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 pt-0 space-y-6">
        {groups.length === 0 && !isScanning ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Layers className="w-12 h-12 mb-4 opacity-20" />
            <p>No duplicates found.</p>
            <p className="text-sm mt-1">Select a folder and click Start Scan.</p>
          </div>
        ) : (
          groups.map(group => (
            <Card key={group.id} className="overflow-hidden border-destructive/20">
              <CardHeader className="bg-muted/50 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <span className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded-md mr-3">Exact Match</span>
                      {group.files.length} Identical Files
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-4">
                      <span>Size: {formatSize(group.size)}</span>
                      <span className="text-xs opacity-50">SHA-256: {group.hash.substring(0, 16)}...</span>
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant={selections[group.id] ? "default" : "secondary"}
                    disabled={!selections[group.id]}
                    onClick={() => handleResolve(group.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {group.files.length - 1} Selected
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.files.map((file, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer ${selections[group.id] === file.path ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelections(prev => ({ ...prev, [group.id]: file.path }))}
                    >
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selections[group.id] === file.path} 
                        onChange={() => setSelections(prev => ({ ...prev, [group.id]: file.path }))}
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium truncate" title={file.path}>
                          {file.path.split('/').pop() || file.path.split('\\').pop()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate opacity-70" title={file.path}>
                          {file.path}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(file.lastModified).toLocaleString()}
                      </div>
                      {selections[group.id] === file.path && (
                        <div className="px-2 py-1 bg-primary/20 text-primary text-xs rounded font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> KEEP
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
