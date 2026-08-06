import { useEffect, useState } from 'react';
import { useAutomationStore } from '../../store/useAutomationStore';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { WorkflowBuilder } from '../../features/automation/WorkflowBuilder';
import { Zap, Plus, Play, MoreVertical } from 'lucide-react';

export function AutomationPage() {
  const { workflows, isLoading, error, fetchWorkflows, triggerWorkflow } = useAutomationStore();
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  if (isBuilding) {
    return (
      <div className="h-full bg-transparent overflow-auto p-6">
        <WorkflowBuilder 
          onCancel={() => setIsBuilding(false)} 
          onSuccess={() => {
            setIsBuilding(false);
            fetchWorkflows();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="p-6 pb-4 border-b border-white/20 bg-white/5 backdrop-blur-md flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Automation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your active workflows and scheduled tasks.
          </p>
        </div>
        <Button onClick={() => setIsBuilding(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Workflow
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
        
        {isLoading && workflows.length === 0 ? (
          <div className="flex justify-center text-gray-500 p-8">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-xl border-white/30">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Workflows Yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first automated workflow to save time.</p>
            <Button onClick={() => setIsBuilding(true)} variant="outline">Create Workflow</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map(wf => (
              <Card key={wf.id} className="hover:border-indigo-200 transition-colors">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">{wf.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold tracking-wider mt-2 inline-block ${
                        wf.trigger === 'schedule' ? 'bg-blue-50 text-blue-600' :
                        wf.trigger === 'watch' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {wf.trigger}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 text-sm text-gray-500 mb-6">
                    {wf.steps && wf.steps.length > 0 ? (
                      <span className="font-medium">{wf.steps.length} Steps configured</span>
                    ) : (
                      <span>Empty workflow</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${wf.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs font-medium text-gray-500">{wf.isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => triggerWorkflow(wf.id)}>
                      <Play className="w-3 h-3 mr-1" /> Run Now
                    </Button>
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
