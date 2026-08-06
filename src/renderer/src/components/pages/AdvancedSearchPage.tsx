import { useState } from 'react';
import { useIndexerStore } from '../../store/useIndexerStore';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Card, CardContent } from '../ui/Card';
import { Search, FolderOpen, Play, Square, Settings2 } from 'lucide-react';

export function AdvancedSearchPage() {
  const { isIndexing, progress, error, results, isSearching, startIndexing, cancelIndexing, search } = useIndexerStore();
  const [targetDir, setTargetDir] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  
  const handleSelectFolder = async () => {
    const dir = await window.api.openDirectory();
    if (dir) setTargetDir(dir);
  };

  const handleIndex = () => {
    if (targetDir) startIndexing(targetDir);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    search({ text: query });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="p-6 pb-4 border-b bg-white">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-600" />
          Advanced Search Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Index your directories for instant, complex file queries.
        </p>

        {/* Indexing Controls */}
        <div className="mt-6 flex gap-3 items-end p-4 rounded-xl border bg-gray-50">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Target Directory</label>
            <Button variant="outline" className="w-full justify-start text-left font-normal bg-white" onClick={handleSelectFolder}>
              <FolderOpen className="w-4 h-4 mr-2" />
              {targetDir || 'Select a folder to index...'}
            </Button>
          </div>
          {isIndexing ? (
            <Button variant="destructive" onClick={cancelIndexing}>
              <Square className="w-4 h-4 mr-2" /> Stop Indexing
            </Button>
          ) : (
            <Button onClick={handleIndex} disabled={!targetDir}>
              <Play className="w-4 h-4 mr-2" /> Start Indexing
            </Button>
          )}
        </div>

        {isIndexing && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Scanning files...</span>
              <span>{progress.indexed.toLocaleString()} / {progress.scanned.toLocaleString()}</span>
            </div>
            <Progress value={progress.scanned ? (progress.indexed / progress.scanned) * 100 : 0} className="h-2" />
          </div>
        )}
        
        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search indexed files (e.g. *.pdf, budget 2024)..." 
              className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" className="shrink-0">
            <Settings2 className="w-4 h-4 mr-2" /> Filters
          </Button>
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>No results found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-gray-500 mb-4 font-medium">Found {results.length} results</div>
            {results.map((res: any) => (
              <Card key={res.id} className="cursor-pointer hover:border-indigo-200 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="overflow-hidden">
                    <p className="font-medium truncate text-sm">{res.filename}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{res.path}</p>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {(res.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
