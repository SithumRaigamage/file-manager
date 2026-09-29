import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastStore {
  toasts: Toast[]
  show: (tone: ToastTone, message: string) => void
  dismiss: (id: number) => void
}

/** How long a toast stays up; errors stay longer so they can be read. */
const DURATION_MS: Record<ToastTone, number> = { success: 4000, info: 4000, error: 8000 }

let nextId = 1

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (tone, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }))
    setTimeout(() => get().dismiss(id), DURATION_MS[tone])
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

/** Non-blocking replacement for `alert()`, callable from anywhere. */
export const toast = {
  success: (message: string): void => useToastStore.getState().show('success', message),
  error: (message: string): void => useToastStore.getState().show('error', message),
  info: (message: string): void => useToastStore.getState().show('info', message)
}
