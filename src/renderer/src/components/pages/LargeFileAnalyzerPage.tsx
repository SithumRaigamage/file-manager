import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { BarChart, PieChart, HardDrive } from 'lucide-react';

export function LargeFileAnalyzerPage() {
  const [largestFiles, setLargestFiles] = useState<any[]>([]);
  const [extStats, setExtStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      const [filesRes, statsRes] = await Promise.all([
        window.fileflow.analytics.getLargestFiles(50),
        window.fileflow.analytics.getStorageAnalytics()
      ]);

      if (!filesRes.ok) {
        setError(filesRes.error.message);
      } else {
        setLargestFiles(filesRes.data);
      }

      if (statsRes.ok) {
        setExtStats(statsRes.data.extStats);
      }
      
      setIsLoading(false);
    }
    
    loadData();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="p-6 pb-4 border-b border-white/20 bg-white/5 backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-teal-600" />
          Large File Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize storage usage based on indexed files.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">Loading analytics...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="w-5 h-5 text-gray-500" /> Storage by Extension
                </CardTitle>
                <CardDescription>Aggregated from all indexed files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {extStats.slice(0, 10).map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold uppercase">
                          {stat.extension ? stat.extension.replace('.', '') : '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{stat.count} files</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{formatSize(stat.totalSize)}</div>
                    </div>
                  ))}
                  {extStats.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">No data indexed yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart className="w-5 h-5 text-gray-500" /> Top Largest Files
                </CardTitle>
                <CardDescription>Largest 50 files found in index</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="divide-y max-h-[600px] overflow-auto px-6">
                  {largestFiles.map((file, idx) => (
                    <div key={file.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden pr-4">
                        <div className="text-gray-400 text-xs font-mono w-4">{idx + 1}.</div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{file.filename}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5" title={file.path}>{file.path}</p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                        {formatSize(file.size)}
                      </div>
                    </div>
                  ))}
                  {largestFiles.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">No data indexed yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
