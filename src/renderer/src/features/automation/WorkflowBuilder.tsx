import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Play, Clock, FolderOpen, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useAutomationStore } from '../../store/useAutomationStore';

export function WorkflowBuilder({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<'manual' | 'schedule' | 'watch'>('manual');
  const [cron, setCron] = useState('* * * * *');
  const [watchPath, setWatchPath] = useState('');
  const [steps, setSteps] = useState<any[]>([]);

  const { createWorkflow, isLoading } = useAutomationStore();

  const handleAddStep = (type: string) => {
    setSteps([...steps, { type, config: {} }]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleSelectFolder = async () => {
    const dir = await window.api.openDirectory();
    if (dir) setWatchPath(dir);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    let triggerConfig: any = null;
    if (trigger === 'schedule') triggerConfig = { cron };
    if (trigger === 'watch') triggerConfig = { path: watchPath };

    const success = await createWorkflow({
      name,
      description: 'Custom Workflow',
      trigger,
      triggerConfig,
      steps,
      isActive: true,
    });

    if (success) {
      onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 max-w-3xl mx-auto mt-6">
      <h2 className="text-xl font-bold mb-6">Create New Workflow</h2>
      
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-semibold mb-2">Workflow Name</label>
          <input 
            type="text" 
            className="w-full border rounded-lg px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Nightly Cleanup"
          />
        </div>

        {/* Trigger Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2">Trigger</label>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => setTrigger('manual')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${trigger === 'manual' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
            >
              <Play className="w-5 h-5" />
              <span className="text-sm font-medium">Manual</span>
            </button>
            <button 
              onClick={() => setTrigger('schedule')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${trigger === 'schedule' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Scheduled</span>
            </button>
            <button 
              onClick={() => setTrigger('watch')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${trigger === 'watch' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-sm font-medium">Folder Watch</span>
            </button>
          </div>
        </div>

        {/* Trigger Config */}
        {trigger === 'schedule' && (
          <div>
            <label className="block text-sm font-semibold mb-2">Cron Expression</label>
            <input 
              type="text" 
              className="w-full border rounded-lg px-3 py-2 font-mono"
              value={cron}
              onChange={e => setCron(e.target.value)}
              placeholder="0 0 * * *"
            />
            <p className="text-xs text-gray-500 mt-1">e.g. 0 0 * * * (Midnight every day)</p>
          </div>
        )}

        {trigger === 'watch' && (
          <div>
            <label className="block text-sm font-semibold mb-2">Target Folder</label>
            <Button variant="outline" className="w-full justify-start" onClick={handleSelectFolder}>
              <FolderOpen className="w-4 h-4 mr-2" /> {watchPath || 'Select Folder'}
            </Button>
          </div>
        )}

        {/* Steps */}
        <div>
          <label className="block text-sm font-semibold mb-2">Action Sequence</label>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Card className="flex-1">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                      <span className="font-semibold capitalize">{step.type}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveStep(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
                {idx < steps.length - 1 && <ArrowRight className="w-5 h-5 text-gray-400" />}
              </div>
            ))}
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => handleAddStep('organize')}>
                <Plus className="w-4 h-4 mr-1" /> Organize
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddStep('rename')}>
                <Plus className="w-4 h-4 mr-1" /> Rename
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddStep('convert')}>
                <Plus className="w-4 h-4 mr-1" /> Convert
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !name.trim() || steps.length === 0}>
            {isLoading ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>
    </div>
  );
}
