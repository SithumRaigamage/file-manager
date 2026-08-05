import React, { useEffect } from 'react'
import { History, RotateCcw, AlertTriangle } from 'lucide-react'
import { useHistoryStore } from '../../store/useHistoryStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'

export function HistoryPage(): React.JSX.Element {
  const {
    batches,
    isLoading,
    error,
    fetchBatches,
    revertBatch
  } = useHistoryStore()

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Operation History</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Review past actions and safely undo operations.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchBatches()} disabled={isLoading}>
            <History size={14} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4 max-w-4xl mx-auto">
          {batches.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-slate-500 bg-white border border-dashed rounded-xl">
              No operation history found.
            </div>
          ) : (
            batches.map(batch => (
              <Card key={batch.id}>
                <CardHeader className="py-4 px-6 border-b bg-slate-50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="capitalize text-lg">{batch.type} Operation</CardTitle>
                    <CardDescription>{new Date(batch.timestamp).toLocaleString()}</CardDescription>
                  </div>
                  <div>
                    {batch.reversible ? (
                      <Button variant="outline" size="sm" onClick={() => revertBatch(batch.id)} disabled={isLoading}>
                        <RotateCcw size={14} className="mr-2" />
                        Undo Batch
                      </Button>
                    ) : (
                      <div className="flex items-center text-orange-600 text-xs font-semibold bg-orange-100 px-3 py-1.5 rounded-full">
                        <AlertTriangle size={12} className="mr-1" />
                        Non-Reversible
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-64 overflow-y-auto">
                    {batch.items.map((item, idx) => (
                      <div key={idx} className={`px-6 py-3 border-b text-sm flex gap-4 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <div className="flex-1 truncate text-slate-500" title={item.before}>{item.before.split('/').pop()}</div>
                        <div className="text-slate-300">→</div>
                        <div className="flex-1 truncate font-medium text-slate-700" title={item.after}>{item.after.split('/').pop()}</div>
                        <div className={`text-xs font-semibold uppercase ${item.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
