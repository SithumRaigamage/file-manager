import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { OrganizerPage } from './components/pages/OrganizerPage'
import { RenamerPage } from './components/pages/RenamerPage'
import { ConverterPage } from './components/pages/ConverterPage'
import { SearcherPage } from './components/pages/SearcherPage'
import { Mp4AnalyzerPage } from './components/pages/Mp4AnalyzerPage'
import './assets/main.css'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<OrganizerPage />} />
            <Route path="/renamer" element={<RenamerPage />} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/searcher" element={<SearcherPage />} />
            <Route path="/mp4-analyzer" element={<Mp4AnalyzerPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

