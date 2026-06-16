import React from 'react'
import { motion } from 'framer-motion'
import { FileVideo, ShieldCheck, AlertTriangle, Hammer, ShieldAlert } from 'lucide-react'
import { Mp4AnalyzerSummary } from '../../types/mp4analyzer'

interface SummaryCardsProps {
  summary: Mp4AnalyzerSummary
}

export function SummaryCards({ summary }: SummaryCardsProps): React.JSX.Element {
  const cards = [
    {
      label: 'Total Scanned',
      value: summary.totalFiles,
      icon: FileVideo,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50/55'
    },
    {
      label: 'Healthy Videos',
      value: summary.healthyFiles,
      icon: ShieldCheck,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50/55'
    },
    {
      label: 'Corrupted Videos',
      value: summary.corruptedFiles,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50/55'
    },
    {
      label: 'Repairable',
      value: summary.repairableFiles,
      icon: Hammer,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-600',
      bgColor: 'bg-cyan-50/55'
    },
    {
      label: 'Unrecoverable',
      value: summary.unrecoverableFiles,
      icon: ShieldAlert,
      color: 'from-rose-500 to-red-600',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50/55'
    }
  ]

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.15 } }}
            className="relative overflow-hidden bg-white border border-gray-100/80 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            {/* Soft decorative background shape */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-[0.03] pointer-events-none`} />
            
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.textColor}`}>
                <Icon size={20} className="stroke-[2.2]" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {card.label}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                {card.value}
              </span>
              {summary.totalFiles > 0 && card.label !== 'Total Scanned' && (
                <span className="text-xs font-medium text-gray-400">
                  {Math.round((card.value / summary.totalFiles) * 100)}%
                </span>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
