import React, { useState, useRef } from 'react'
import { ArrowLeft, Image as ImageIcon, Upload, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'

export function ImageToolkitPage(): React.JSX.Element {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [targetWidth, setTargetWidth] = useState<string>('800')
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImageSrc(url)
    }
  }

  const handleConvert = () => {
    if (!imageSrc || !canvasRef.current) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = parseInt(targetWidth, 10) || img.width
      const scale = width / img.width
      const height = img.height * scale

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      // Download the result
      const dataUrl = canvas.toDataURL(targetFormat, 0.9)
      const link = document.createElement('a')
      link.download = `converted-${Date.now()}.${targetFormat.split('/')[1]}`
      link.href = dataUrl
      link.click()
    }
    img.src = imageSrc
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-6 pt-6 pb-4 border-b border-white/20 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/toolkits" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              Image Toolkit
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Resize and convert images locally.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Source Image</CardTitle>
            </CardHeader>
            <CardContent>
              {!imageSrc ? (
                <label className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Click to upload an image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="relative">
                  <img src={imageSrc} alt="Preview" className="max-h-64 object-contain mx-auto rounded-lg shadow-sm" />
                  <button 
                    onClick={() => setImageSrc(null)}
                    className="absolute top-2 right-2 px-3 py-1 bg-white/40/80 backdrop-blur text-xs font-medium rounded shadow hover:bg-white/40 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={!imageSrc ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>Resize & Convert Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Width (px)</label>
                <input 
                  type="number" 
                  value={targetWidth}
                  onChange={e => setTargetWidth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Height will be scaled automatically to maintain aspect ratio.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={targetFormat}
                  onChange={e => setTargetFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white/40"
                >
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>

              <div className="pt-4">
                <Button onClick={handleConvert} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Convert & Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  )
}
