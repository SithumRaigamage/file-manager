import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FolderOpen, Type, RefreshCw, Search, Settings, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'

const navItems = [
  {
    to: '/',
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
    label: 'Searcher',
    description: 'Search & collect files',
    color: 'text-amber-600',
    activeBg: 'bg-amber-50',
    activeBar: 'bg-amber-500'
  },
  {
    to: '/mp4-analyzer',
    icon: ShieldCheck,
    label: 'MP4 Analyzer',
    description: 'Check video integrity',
    color: 'text-rose-600',
    activeBg: 'bg-rose-50',
    activeBar: 'bg-rose-600'
  }
]

export function Sidebar(): React.ReactElement {
  const location = useLocation()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-gray-50 border-r border-gray-100 h-full">
      {/* App Header */}
      <div className="drag-region px-5 pt-10 pb-5">
        <div className="no-drag flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">FM</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">FileFlow</h1>
            <p className="text-xs text-gray-400 leading-tight">File Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group cursor-pointer',
                isActive
                  ? `${item.activeBg}`
                  : 'hover:bg-white hover:shadow-sm'
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
                  isActive ? item.color : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium leading-tight',
                    isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-800'
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-400 truncate">{item.description}</p>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-white hover:text-gray-600 cursor-pointer transition-all hover:shadow-sm">
          <Settings size={16} />
          <span className="text-xs font-medium">Settings</span>
        </div>
        <p className="text-xs text-gray-300 text-center mt-2">v1.0.0</p>
      </div>
    </aside>
  )
}
