import { create } from 'zustand'

export interface ConversionPreset {
  id: string
  name: string
  targetContainer: 'mp4' | 'mkv' | 'mp3' | 'wav' | 'aac'
  ffmpegArgs: string[]
}

export interface ConversionJobState {
  id: string
  inputPath: string
  progress: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
}

interface ConverterState {
  selectedFiles: string[]
  jobs: Record<string, ConversionJobState> // keyed by jobId
  preset: ConversionPreset | null
  isLoading: boolean
  error: string | null

  setSelectedFiles: (paths: string[]) => void
  setPreset: (preset: ConversionPreset) => void
  enqueueConversion: () => Promise<void>
  cancelConversion: (jobId: string) => Promise<void>
  initProgressListener: () => void
}

export const useConverterStore = create<ConverterState>((set, get) => {
  let unsubscribeProgress: (() => void) | null = null

  return {
    selectedFiles: [],
    jobs: {},
    preset: null,
    isLoading: false,
    error: null,

    setSelectedFiles: (paths) => set({ selectedFiles: paths }),
    setPreset: (preset) => set({ preset }),

    enqueueConversion: async () => {
      const { selectedFiles, preset, initProgressListener } = get()
      if (selectedFiles.length === 0 || !preset) return

      // Ensure progress listener is active
      initProgressListener()

      set({ isLoading: true, error: null })
      try {
        const res = await window.fileflow.converter.enqueueConversion(selectedFiles, preset)
        if (res.ok) {
          // The backend might return one job ID representing the batch, or per file. 
          // Our implementation currently returns a batch `jobId` from `enqueue`.
          // We can track the batch or just let the progress events populate the state.
          // For now, we rely on progress events to add/update job states.
          set({ selectedFiles: [] }) // clear selection
        } else {
          set({ error: res.error.message })
        }
      } catch (err) {
        set({ error: (err as Error).message })
      } finally {
        set({ isLoading: false })
      }
    },

    cancelConversion: async (jobId) => {
      try {
        const res = await window.fileflow.converter.cancelConversion(jobId)
        if (!res.ok) {
          set({ error: res.error.message })
        }
      } catch (err) {
        set({ error: (err as Error).message })
      }
    },

    initProgressListener: () => {
      if (unsubscribeProgress) return // Already initialized

      unsubscribeProgress = window.fileflow.converter.onProgress((event) => {
        set((state) => {
          const { jobId, file, progress } = event
          const existingJob = state.jobs[jobId] || {
            id: jobId,
            inputPath: file,
            status: 'pending',
            progress: 0
          }

          let status = existingJob.status
          if (progress > 0 && progress < 100) status = 'processing'
          if (progress === 100) status = 'completed'

          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...existingJob,
                progress,
                status
              }
            }
          }
        })
      })
    }
  }
})
