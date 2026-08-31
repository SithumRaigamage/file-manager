import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
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
import './assets/main.css'

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
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/organizer" element={<OrganizerPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/renamer" element={<RenamerPage />} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/searcher" element={<AdvancedSearchPage />} />
            <Route path="/analytics" element={<LargeFileAnalyzerPage />} />
            <Route path="/toolkits" element={<ToolkitsPage />} />
            <Route path="/toolkits/image" element={<ImageToolkitPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/mp4-analyzer" element={<Mp4AnalyzerPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/duplicates" element={<DuplicatesPage />} />
          </Routes>
        </main>
      </div>
      <CommandPalette />
    </HashRouter>
  )
}
