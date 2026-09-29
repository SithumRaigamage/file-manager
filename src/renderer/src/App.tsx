import React, { lazy } from 'react'
import { HashRouter } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardPage } from './components/pages/DashboardPage'
import { CommandPalette } from './components/layout/CommandPalette'
import { Toaster } from './components/shared/Toaster'
import { AppearanceProvider } from './components/layout/AppearanceProvider'
import { KeepAliveRoutes, KeepAliveRoute } from './components/layout/KeepAliveRoutes'
import './assets/main.css'

/**
 * Code-splits a page (P3): its bundle — and heavy deps like recharts or jspdf —
 * loads on first visit instead of at startup. The Dashboard stays eager because
 * it is the landing page.
 */
function lazyPage<K extends string>(
  load: () => Promise<Record<K, React.ComponentType>>,
  name: K
): React.LazyExoticComponent<React.ComponentType> {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}

const OrganizerPage = lazyPage(() => import('./components/pages/OrganizerPage'), 'OrganizerPage')
const RenamerPage = lazyPage(() => import('./components/pages/RenamerPage'), 'RenamerPage')
const ConverterPage = lazyPage(() => import('./components/pages/ConverterPage'), 'ConverterPage')
const Mp4AnalyzerPage = lazyPage(
  () => import('./components/pages/Mp4AnalyzerPage'),
  'Mp4AnalyzerPage'
)
const HistoryPage = lazyPage(() => import('./components/pages/HistoryPage'), 'HistoryPage')
const DuplicatesPage = lazyPage(() => import('./components/pages/DuplicatesPage'), 'DuplicatesPage')
const AdvancedSearchPage = lazyPage(
  () => import('./components/pages/AdvancedSearchPage'),
  'AdvancedSearchPage'
)
const LargeFileAnalyzerPage = lazyPage(
  () => import('./components/pages/LargeFileAnalyzerPage'),
  'LargeFileAnalyzerPage'
)
const AutomationPage = lazyPage(() => import('./components/pages/AutomationPage'), 'AutomationPage')
const ToolkitsPage = lazyPage(() => import('./components/pages/ToolkitsPage'), 'ToolkitsPage')
const ImageToolkitPage = lazyPage(
  () => import('./components/pages/ImageToolkitPage'),
  'ImageToolkitPage'
)
const SettingsPage = lazyPage(() => import('./components/pages/SettingsPage'), 'SettingsPage')
const SearcherPage = lazyPage(() => import('./components/pages/SearcherPage'), 'SearcherPage')

// Pages stay mounted after first visit (see KeepAliveRoutes) so switching tabs
// never discards in-progress work.
const routes: KeepAliveRoute[] = [
  { path: '/', label: 'Dashboard', element: <DashboardPage /> },
  { path: '/organizer', label: 'Organizer', element: <OrganizerPage /> },
  { path: '/automation', label: 'Automation', element: <AutomationPage /> },
  { path: '/renamer', label: 'Renamer', element: <RenamerPage /> },
  { path: '/converter', label: 'Converter', element: <ConverterPage /> },
  { path: '/searcher', label: 'Advanced Search', element: <AdvancedSearchPage /> },
  { path: '/drive-search', label: 'Drive Search', element: <SearcherPage /> },
  { path: '/analytics', label: 'Storage Analytics', element: <LargeFileAnalyzerPage /> },
  { path: '/toolkits', label: 'Toolkits', element: <ToolkitsPage /> },
  { path: '/toolkits/image', label: 'Image Toolkit', element: <ImageToolkitPage /> },
  { path: '/settings', label: 'Settings', element: <SettingsPage /> },
  { path: '/mp4-analyzer', label: 'MP4 Analyzer', element: <Mp4AnalyzerPage /> },
  { path: '/history', label: 'History', element: <HistoryPage /> },
  { path: '/duplicates', label: 'Duplicates', element: <DuplicatesPage /> }
]

export default function App(): React.JSX.Element {
  return (
    <AppearanceProvider>
      <HashRouter>
        <div className="flex h-screen overflow-hidden bg-transparent text-gray-900 relative">
          {/* Soft Aurora Mesh Background */}
          <div className="absolute inset-0 pointer-events-none -z-10 bg-slate-50">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300/30 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-300/30 blur-[100px]" />
            <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-300/20 blur-[80px]" />
          </div>

          <Sidebar />
          <main className="flex-1 overflow-hidden flex flex-col z-0">
            <KeepAliveRoutes routes={routes} />
          </main>
        </div>
        <CommandPalette />
        <Toaster />
      </HashRouter>
    </AppearanceProvider>
  )
}
