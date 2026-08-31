import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FolderOpen, Type, RefreshCw, Search, Settings, ShieldCheck, History, Layers, HardDrive, Zap, Wrench } from 'lucide-react'
import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'

const navItems = [
  {
    to: '/',
    icon: FolderOpen,
    label: 'Dashboard',
    description: 'System overview',
    color: 'text-indigo-600',
    activeBg: 'bg-indigo-50',
    activeBar: 'bg-indigo-600'
  },
  {
    to: '/automation',
    icon: Zap,
    label: 'Automation',
    description: 'Visual workflows',
    color: 'text-yellow-600',
    activeBg: 'bg-yellow-50',
    activeBar: 'bg-yellow-500'
  },
  {
    to: '/organizer',
    icon: FolderOpen,
    label: 'Organizer',
    description: 'Sort files by type',
    color: 'text-blue-600',
    activeBg: 'bg-blue-50',
    activeBar: 'bg-blue-600'
  },
  {
    to: '/renamer',
    icon: Type,
    label: 'Renamer',
    description: 'Bulk rename files',
    color: 'text-violet-600',
    activeBg: 'bg-violet-50',
    activeBar: 'bg-violet-600'
  },
  {
    to: '/converter',
    icon: RefreshCw,
    label: 'Converter',
    description: 'Convert file formats',
    color: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
    activeBar: 'bg-emerald-600'
  },
  {
    to: '/searcher',
    icon: Search,
    label: 'Advanced Search',
    description: 'Instant file search',
    color: 'text-amber-600',
    activeBg: 'bg-amber-50',
    activeBar: 'bg-amber-500'
  },
  {
    to: '/toolkits',
    icon: Wrench,
    label: 'Toolkits',
    description: 'File utilities',
    color: 'text-indigo-500',
    activeBg: 'bg-indigo-50',
    activeBar: 'bg-indigo-600'
  },
  {
    to: '/analytics',
    icon: HardDrive,
    label: 'Storage Analytics',
    description: 'Visualize usage',
    color: 'text-teal-600',
    activeBg: 'bg-teal-50',
    activeBar: 'bg-teal-600'
  },
  {
    to: '/mp4-analyzer',
    icon: ShieldCheck,
    label: 'MP4 Analyzer',
    description: 'Check video integrity',
    color: 'text-rose-600',
    activeBg: 'bg-rose-50',
    activeBar: 'bg-rose-600'
  },
  {
    to: '/duplicates',
    icon: Layers,
    label: 'Duplicates',
    description: 'Find identical files',
    color: 'text-cyan-600',
    activeBg: 'bg-cyan-50',
    activeBar: 'bg-cyan-600'
  },
  {
    to: '/history',
    icon: History,
    label: 'History',
    description: 'Undo past operations',
    color: 'text-slate-600',
    activeBg: 'bg-slate-100',
    activeBar: 'bg-slate-600'
  }
]

export function Sidebar(): React.ReactElement {
  const location = useLocation()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-white/20 backdrop-blur-md border-r border-white/30 h-full shadow-[2px_0_8px_rgba(0,0,0,0.02)] z-10 relative">
      {/* App Header */}
      <div className="drag-region px-5 pt-10 pb-5">
        <div className="no-drag-region flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/80 to-violet-600/80 backdrop-blur flex items-center justify-center shadow-glass border border-white/20">
            <span className="text-white text-sm font-bold shadow-sm">FM</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">FileFlow</h1>
            <p className="text-xs text-gray-500 leading-tight font-medium">File Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto no-drag-region">
        {navItems.map((item) => {
          const isActive =
            item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer',
                isActive ? `${item.activeBg} shadow-sm border border-white/50 backdrop-blur-sm` : 'hover:bg-white/40 hover:shadow-sm hover:border hover:border-white/30 border border-transparent'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-full', item.activeBar)}
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <item.icon
                size={18}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? item.color : 'text-gray-500 group-hover:text-gray-700'
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                  )}
                >
                  {item.label}
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.description}</p>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/30 no-drag-region">
        <NavLink 
          to="/settings"
          className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer border ${isActive ? 'bg-white/50 text-gray-900 shadow-sm border-white/50' : 'text-gray-500 hover:bg-white/40 hover:text-gray-700 hover:shadow-sm hover:border-white/30 border-transparent'}`}
        >
          <Settings size={16} />
          <span className="text-xs font-semibold">Settings</span>
        </NavLink>
        <p className="text-xs text-gray-400/80 text-center mt-2 font-medium">v1.0.0</p>
      </div>
    </aside>
  )
}
