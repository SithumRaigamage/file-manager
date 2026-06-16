import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function getFileIcon(ext: string): string {
  const e = ext.toLowerCase().replace('.', '')
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'].includes(e)) return '🎬'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(e)) return '🎵'
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(e)) return '🖼️'
  if (['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf'].includes(e)) return '📄'
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(e)) return '📦'
  if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json'].includes(e)) return '💻'
  return '📁'
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Videos: 'bg-purple-100 text-purple-700 border-purple-200',
    Music: 'bg-blue-100 text-blue-700 border-blue-200',
    Images: 'bg-green-100 text-green-700 border-green-200',
    Documents: 'bg-orange-100 text-orange-700 border-orange-200',
    Archives: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Code: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    Others: 'bg-gray-100 text-gray-700 border-gray-200'
  }
  return colors[category] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}
