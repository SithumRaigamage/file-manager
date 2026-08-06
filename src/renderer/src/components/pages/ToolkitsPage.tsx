import React from 'react'
import { Link } from 'react-router-dom'
import { Image as ImageIcon, FileText, Archive, Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'

export function ToolkitsPage(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-6 pt-6 pb-4 border-b border-white/20 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-500" />
              Toolkits
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Specialized utilities for processing specific file types.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/toolkits/image">
            <Card className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer h-full group">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-2 group-hover:bg-indigo-100 transition-colors">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <CardTitle>Image Toolkit</CardTitle>
                <CardDescription>Batch resize, crop, and convert images.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-400">Available Now</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-60 cursor-not-allowed">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <CardTitle>PDF Toolkit</CardTitle>
              <CardDescription>Merge, split, and compress PDF documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Coming Soon
              </span>
            </CardContent>
          </Card>

          <Card className="opacity-60 cursor-not-allowed">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
                <Archive className="w-5 h-5 text-amber-600" />
              </div>
              <CardTitle>Archive Manager</CardTitle>
              <CardDescription>Extract, compress, and password-protect archives.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Coming Soon
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
