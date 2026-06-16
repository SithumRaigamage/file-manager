import { create } from 'zustand'

export interface ConvertJob {
  id: string
  inputPath: string
  inputName: string
  outputFormat: string
  outputDir: string
  outputName?: string
  videoQuality: 'high' | 'medium' | 'low'
  audioQuality: 'high' | 'medium' | 'low'
  status: 'pending' | 'converting' | 'done' | 'error'
  progress: number
  outputPath?: string
  error?: string
}

interface ConverterState {
  ffmpegAvailable: boolean | null
  ffmpegPath: string | null
  jobs: ConvertJob[]
  outputDir: string | null
  videoQuality: 'high' | 'medium' | 'low'
  audioQuality: 'high' | 'medium' | 'low'

  setFFmpegStatus: (available: boolean, path?: string) => void
  addJobs: (inputs: Array<{ inputPath: string; outputFormat: string }>) => void
  removeJob: (id: string) => void
  updateJob: (id: string, data: Partial<ConvertJob>) => void
  setOutputDir: (dir: string | null) => void
  setVideoQuality: (q: 'high' | 'medium' | 'low') => void
  setAudioQuality: (q: 'high' | 'medium' | 'low') => void
  clearCompleted: () => void
  clearAll: () => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const useConverterStore = create<ConverterState>((set) => ({
  ffmpegAvailable: null,
  ffmpegPath: null,
  jobs: [],
  outputDir: null,
  videoQuality: 'medium',
  audioQuality: 'medium',

  setFFmpegStatus: (available, path) =>
    set({ ffmpegAvailable: available, ffmpegPath: path ?? null }),

  addJobs: (inputs) =>
    set((s) => ({
      jobs: [
        ...s.jobs,
        ...inputs.map((inp) => ({
          id: generateId(),
          inputPath: inp.inputPath,
          inputName: inp.inputPath.split('/').pop() ?? inp.inputPath,
          outputFormat: inp.outputFormat,
          outputDir: s.outputDir ?? '',
          videoQuality: s.videoQuality,
          audioQuality: s.audioQuality,
          status: 'pending' as const,
          progress: 0
        }))
      ]
    })),

  removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  updateJob: (id, data) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)) })),
  setOutputDir: (dir) => set({ outputDir: dir }),
  setVideoQuality: (q) => set({ videoQuality: q }),
  setAudioQuality: (q) => set({ audioQuality: q }),
  clearCompleted: () =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.status !== 'done' && j.status !== 'error') })),
  clearAll: () => set({ jobs: [] })
}))
