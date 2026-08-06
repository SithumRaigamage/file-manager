import { useEffect } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/Card';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { Activity, FileStack, FolderOpen, RefreshCcw, Layers } from 'lucide-react';

export function DashboardPage() {
  const { stats, isLoading, error, fetchStats } = useDashboardStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to FileFlow v2.0 Platform Foundation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchStats()}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/organizer')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Smart Organizer</CardTitle>
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sort</div>
            <p className="text-xs text-muted-foreground">Categorize files automatically.</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/renamer')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Bulk Renamer</CardTitle>
            <FileStack className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rename</div>
            <p className="text-xs text-muted-foreground">Apply advanced rename patterns.</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/converter')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Media Converter</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Convert</div>
            <p className="text-xs text-muted-foreground">High-speed media processing.</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-primary/5 border-primary/20" onClick={() => navigate('/duplicates')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Duplicate Finder</CardTitle>
            <Layers className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">New in v2.0</div>
            <p className="text-xs text-primary/80">Scan for duplicate files safely.</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Area */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Processed</CardTitle>
            <CardDescription>All-time statistics across all features</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-20 flex items-center justify-center">Loading...</div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-4xl font-bold">{stats?.totalFilesProcessed || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Files modified</p>
                </div>
                {stats?.totalErrors !== undefined && stats.totalErrors > 0 && (
                  <div>
                    <div className="text-xl font-bold text-destructive">{stats.totalErrors}</div>
                    <p className="text-sm text-muted-foreground mt-1">Failed operations</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest batch jobs executed</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-20 flex items-center justify-center">Loading...</div>
            ) : (
              <div className="space-y-4">
                {stats?.recentJobs?.length ? (
                  stats.recentJobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          job.type === 'organize' ? 'bg-blue-500/10 text-blue-500' :
                          job.type === 'rename' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-orange-500/10 text-orange-500'
                        }`}>
                          {job.type === 'organize' && <FolderOpen className="w-4 h-4" />}
                          {job.type === 'rename' && <FileStack className="w-4 h-4" />}
                          {job.type === 'convert' && <Activity className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{job.type} Job</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(job.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {job.itemCount} items
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No recent activity found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
