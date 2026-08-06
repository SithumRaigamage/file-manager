import { create } from 'zustand';

interface AutomationStore {
  workflows: any[];
  isLoading: boolean;
  error: string | null;
  fetchWorkflows: () => Promise<void>;
  createWorkflow: (workflowData: any) => Promise<boolean>;
  triggerWorkflow: (workflowId: string) => Promise<boolean>;
}

export const useAutomationStore = create<AutomationStore>((set) => ({
  workflows: [],
  isLoading: false,
  error: null,

  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    const res = await window.fileflow.automation.listWorkflows();
    if (res.ok) {
      set({ workflows: res.data, isLoading: false });
    } else {
      set({ error: res.error.message, isLoading: false });
    }
  },

  createWorkflow: async (workflowData) => {
    set({ isLoading: true, error: null });
    const res = await window.fileflow.automation.createWorkflow(workflowData);
    if (res.ok) {
      set({ isLoading: false });
      return true;
    } else {
      set({ error: res.error.message, isLoading: false });
      return false;
    }
  },

  triggerWorkflow: async (workflowId) => {
    set({ isLoading: true, error: null });
    const res = await window.fileflow.automation.triggerWorkflow(workflowId);
    if (res.ok) {
      set({ isLoading: false });
      return true;
    } else {
      set({ error: res.error.message, isLoading: false });
      return false;
    }
  }
}));
