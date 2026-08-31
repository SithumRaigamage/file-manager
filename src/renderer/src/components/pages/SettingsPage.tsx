import { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Settings, ShieldCheck, Zap, HardDrive, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';

export function SettingsPage() {
  const { settings, isLoading, error, fetchSettings, updateSetting } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-8 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and configuration.</p>
        
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50/50 border border-red-200/50 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 p-8 pt-4 max-w-4xl space-y-8">
        
        {/* General Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-white/20 pb-2">
            <Settings className="w-4 h-4" /> General
          </h2>
          <Card className="p-0 overflow-hidden bg-white/20 backdrop-blur-xl border-white/30">
            <div className="p-5 flex items-center justify-between border-b border-white/20">
              <div>
                <h3 className="font-semibold text-slate-800">History Retention (Days)</h3>
                <p className="text-sm text-slate-500">How long to keep operation logs in the history database.</p>
              </div>
              <input 
                type="number"
                min={1}
                max={365}
                value={settings.historyRetentionDays}
                onChange={(e) => updateSetting('historyRetentionDays', parseInt(e.target.value) || 90)}
                className="w-24 px-3 py-2 bg-white/40 border border-white/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Reduced Motion</h3>
                <p className="text-sm text-slate-500">Disable non-essential animations across the app.</p>
              </div>
              <Switch 
                checked={settings.reducedMotion} 
                onChange={(c) => updateSetting('reducedMotion', c)} 
              />
            </div>
          </Card>
        </section>

        {/* File Operations */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-white/20 pb-2">
            <HardDrive className="w-4 h-4" /> File Operations
          </h2>
          <Card className="p-0 overflow-hidden bg-white/20 backdrop-blur-xl border-white/30">
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Default Destructive Behavior</h3>
                <p className="text-sm text-slate-500">Behavior when performing "Move" or "Delete" operations.</p>
              </div>
              <select
                value={settings.defaultDestructiveBehavior}
                onChange={(e) => updateSetting('defaultDestructiveBehavior', e.target.value as any)}
                className="px-3 py-2 bg-white/40 border border-white/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700"
              >
                <option value="prompt">Always Prompt</option>
                <option value="always-copy">Always Copy (Safe)</option>
              </select>
            </div>
          </Card>
        </section>

        {/* Advanced Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-white/20 pb-2">
            <Zap className="w-4 h-4" /> Advanced
          </h2>
          <Card className="p-0 overflow-hidden bg-white/20 backdrop-blur-xl border-white/30">
            <div className="p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">Custom FFmpeg Path</h3>
                <p className="text-sm text-slate-500">Override the bundled FFmpeg binary path. Leave blank to use bundled.</p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="/usr/local/bin/ffmpeg (Optional)"
                  value={settings.ffmpegPath || ''}
                  onChange={(e) => updateSetting('ffmpegPath', e.target.value === '' ? null : e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/40 border border-white/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-400"
                />
                <Button variant="outline" onClick={() => updateSetting('ffmpegPath', null)}>Clear</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Privacy Section */}
        <section className="space-y-4 pb-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-white/20 pb-2">
            <ShieldCheck className="w-4 h-4" /> Privacy
          </h2>
          <Card className="p-0 overflow-hidden bg-white/20 backdrop-blur-xl border-white/30">
            <div className="p-5 flex items-center justify-between border-b border-white/20">
              <div>
                <h3 className="font-semibold text-slate-800">Crash Reporting</h3>
                <p className="text-sm text-slate-500">Help us fix bugs by sending anonymous crash reports.</p>
              </div>
              <Switch 
                checked={settings.crashReportingOptIn} 
                onChange={(c) => updateSetting('crashReportingOptIn', c)} 
              />
            </div>
            
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Usage Telemetry</h3>
                <p className="text-sm text-slate-500">Send anonymous usage data to help improve FileFlow.</p>
              </div>
              <Switch 
                checked={settings.telemetryOptIn} 
                onChange={(c) => updateSetting('telemetryOptIn', c)} 
              />
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}
