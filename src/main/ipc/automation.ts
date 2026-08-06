import { ipcMain } from 'electron';
import { db } from '../db';
import { workflows } from '../db/schema';
import { randomUUID } from 'crypto';
import { workflowEngine } from '../features/automation/workflow-engine';

export function registerAutomationHandlers(): void {
  ipcMain.handle('fileflow:automation:listWorkflows', async () => {
    try {
      const data = db.select().from(workflows).all();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:automation:createWorkflow', async (_event, workflowData) => {
    try {
      const id = randomUUID();
      db.insert(workflows).values({
        id,
        name: workflowData.name,
        description: workflowData.description,
        trigger: workflowData.trigger,
        triggerConfig: workflowData.triggerConfig,
        steps: workflowData.steps,
        isActive: workflowData.isActive ?? true,
        createdAt: new Date().toISOString()
      }).run();
      return { ok: true, data: { id } };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:automation:triggerWorkflow', async (_event, workflowId: string) => {
    try {
      const result = await workflowEngine.execute(workflowId);
      if (!result.success) {
        return { ok: false, error: { code: 'WORKFLOW_ERROR', message: result.message } };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'WORKFLOW_ERROR', message: (error as Error).message } };
    }
  });
}
