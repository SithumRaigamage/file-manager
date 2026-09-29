import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, ToastTone } from '../../store/useToastStore'

const TONE_STYLES: Record<ToastTone, { box: string; Icon: typeof Info }> = {
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: CheckCircle2 },
  error: { box: 'bg-rose-50 border-rose-200 text-rose-900', Icon: AlertTriangle },
  info: { box: 'bg-white border-gray-200 text-gray-900', Icon: Info }
}

/** Renders app-wide toasts (bottom-right). Errors are announced assertively. */
export function Toaster(): React.JSX.Element {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
      <AnimatePresence initial={false}>
        {toasts.map(({ id, tone, message }) => {
          const { box, Icon } = TONE_STYLES[tone]
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role={tone === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm ${box}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p className="flex-1 break-words">{message}</p>
              <button
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
