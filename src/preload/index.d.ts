import {
  OrganizePreviewItem,
  OrganizeResult,
  SmartRuleDefinition,
  RuleSet,
  RenamePreviewItem,
  RenameResult,
  RenamePattern,
  ConversionPreset,
  ConversionProgressEvent,
  BatchRecord,
  HistoryFilter,
  IpcResponse,
} from './index';

declare global {
  interface Window {
    fileflow: {
      organizer: {
        listFolder(path: string): Promise<IpcResponse<any[]>>;
        previewQuickRule(path: string, ruleId: string): Promise<IpcResponse<OrganizePreviewItem[]>>;
        previewSmartRule(path: string, rule: SmartRuleDefinition): Promise<IpcResponse<OrganizePreviewItem[]>>;
        applyOrganize(items: OrganizePreviewItem[]): Promise<IpcResponse<OrganizeResult>>;
        watchFolder(path: string, ruleSet: RuleSet): Promise<IpcResponse<{ watcherId: string }>>;
        unwatchFolder(watcherId: string): Promise<IpcResponse<void>>;
      };
      renamer: {
        previewRename(paths: string[], pattern: RenamePattern): Promise<IpcResponse<RenamePreviewItem[]>>;
        applyRename(items: RenamePreviewItem[]): Promise<IpcResponse<RenameResult>>;
        undoRename(batchId: string): Promise<IpcResponse<void>>;
      };
      converter: {
        enqueueConversion(paths: string[], preset: ConversionPreset): Promise<IpcResponse<{ jobId: string }>>;
        cancelConversion(jobId: string): Promise<IpcResponse<void>>;
        onProgress(callback: (event: ConversionProgressEvent) => void): () => void;
      };
      history: {
        listBatches(filter?: HistoryFilter): Promise<IpcResponse<BatchRecord[]>>;
        revertBatch(batchId: string): Promise<IpcResponse<void>>;
      };
      settings: {
        get(): Promise<IpcResponse<any>>;
        update(updates: any): Promise<IpcResponse<void>>;
      };
      duplicates: {
        scan(dirPath: string): Promise<IpcResponse<void>>;
        cancel(): Promise<IpcResponse<void>>;
        getGroups: () => Promise<IpcResponse<any[]>>;
        clear: () => Promise<IpcResponse<void>>;
        resolve: (groupId: string, keepPath: string, deletePaths: string[]) => Promise<IpcResponse<void>>;
        onProgress(callback: (data: any) => void): () => void;
      };
      dashboard: {
        getStats(): Promise<IpcResponse<any>>;
      };
      indexer: {
        start(dirPath: string): Promise<IpcResponse<void>>;
        cancel(): Promise<IpcResponse<void>>;
        search(query: any): Promise<IpcResponse<any[]>>;
        onProgress(callback: (data: any) => void): () => void;
      };
      analytics: {
        getLargestFiles(limit: number): Promise<IpcResponse<any[]>>;
        getStorageAnalytics(): Promise<IpcResponse<any>>;
      };
      automation: {
        listWorkflows(): Promise<IpcResponse<any[]>>;
        createWorkflow(workflowData: any): Promise<IpcResponse<{ id: string }>>;
        triggerWorkflow(workflowId: string): Promise<IpcResponse<void>>;
      };
      tags: {
        getAll(): Promise<IpcResponse<any[]>>;
        create(data: { name: string, color?: string }): Promise<IpcResponse<any>>;
        delete(id: string): Promise<IpcResponse<void>>;
        assignToFile(filePath: string, tagId: string): Promise<IpcResponse<void>>;
        removeFromFile(filePath: string, tagId: string): Promise<IpcResponse<void>>;
        getTagsForFile(filePath: string): Promise<IpcResponse<any[]>>;
      };
      ai: {
        checkStatus(): Promise<IpcResponse<{ isAvailable: boolean; message?: string }>>;
        suggestCategories(folderPath: string, categories: string[]): Promise<IpcResponse<any[]>>;
        executeCommand(query: string): Promise<IpcResponse<{ message: string; details?: any }>>;
      };
    };
    api: any;
    electron: any;
  }
}
