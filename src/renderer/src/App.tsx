import React from 'react'
import { HashRouter } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { OrganizerPage } from './components/pages/OrganizerPage'
import { RenamerPage } from './components/pages/RenamerPage'
import { ConverterPage } from './components/pages/ConverterPage'
import { Mp4AnalyzerPage } from './components/pages/Mp4AnalyzerPage'
import { HistoryPage } from './components/pages/HistoryPage'
import { DashboardPage } from './components/pages/DashboardPage'
import { DuplicatesPage } from './components/pages/DuplicatesPage'
import { AdvancedSearchPage } from './components/pages/AdvancedSearchPage'
import { LargeFileAnalyzerPage } from './components/pages/LargeFileAnalyzerPage'
import { AutomationPage } from './components/pages/AutomationPage'
import { ToolkitsPage } from './components/pages/ToolkitsPage'
import { ImageToolkitPage } from './components/pages/ImageToolkitPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { CommandPalette } from './components/layout/CommandPalette'
import { KeepAliveRoutes, KeepAliveRoute } from './components/layout/KeepAliveRoutes'
import './assets/main.css'

// Pages stay mounted after first visit (see KeepAliveRoutes) so switching tabs
// never discards in-progress work.
const routes: KeepAliveRoute[] = [
  { path: '/', element: <DashboardPage /> },
  { path: '/organizer', element: <OrganizerPage /> },
  { path: '/automation', element: <AutomationPage /> },
  { path: '/renamer', element: <RenamerPage /> },
  { path: '/converter', element: <ConverterPage /> },
  { path: '/searcher', element: <AdvancedSearchPage /> },
  { path: '/analytics', element: <LargeFileAnalyzerPage /> },
  { path: '/toolkits', element: <ToolkitsPage /> },
  { path: '/toolkits/image', element: <ImageToolkitPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/mp4-analyzer', element: <Mp4AnalyzerPage /> },
  { path: '/history', element: <HistoryPage /> },
  { path: '/duplicates', element: <DuplicatesPage /> }
]

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-transparent text-gray-900 relative">
        {/* Soft Aurora Mesh Background */}
        <div className="absolute inset-0 pointer-events-none -z-10 bg-[#f8fafc]">
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
    </HashRouter>
  )
}
