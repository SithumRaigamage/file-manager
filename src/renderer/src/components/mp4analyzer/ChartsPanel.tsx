import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  Legend
} from 'recharts'
import { Mp4FileResult } from '../../types/mp4analyzer'
import { BarChart3, PieChartIcon, Activity } from 'lucide-react'

interface ChartsPanelProps {
  results: Mp4FileResult[]
}

const COLORS = {
  healthy: '#10b981',      // Emerald 500
  minor: '#f59e0b',        // Amber 500
  moderate: '#f97316',     // Orange 500
  severe: '#ef4444',       // Red 500
  unrecoverable: '#991b1b' // Red 800
}

export function ChartsPanel({ results }: ChartsPanelProps): React.JSX.Element {
  // 1. Corruption Distribution (Pie Chart Data)
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {
      healthy: 0,
      minor: 0,
      moderate: 0,
      severe: 0,
      unrecoverable: 0
    }
    
    for (const r of results) {
      counts[r.corruptionLevel]++
    }

    return Object.entries(counts)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
        key: name,
        value
      }))
      .filter((item) => item.value > 0)
  }, [results])

  // 2. Health Score Histogram (Bar Chart Data)
  const barData = useMemo(() => {
    const buckets = [
      { name: 'Unrecoverable', count: 0, color: COLORS.unrecoverable },
      { name: 'Severe (<70%)', count: 0, color: COLORS.severe },
      { name: 'Moderate (70-90%)', count: 0, color: COLORS.moderate },
      { name: 'Minor (90-98%)', count: 0, color: COLORS.minor },
      { name: 'Healthy (98-100%)', count: 0, color: COLORS.healthy }
    ]

    for (const r of results) {
      if (r.corruptionLevel === 'unrecoverable') {
        buckets[0].count++
        continue
      }
      const score = r.playbackVerification?.healthScore ?? 100
      if (score >= 98) {
        buckets[4].count++
      } else if (score >= 90) {
        buckets[3].count++
      } else if (score >= 70) {
        buckets[2].count++
      } else {
        buckets[1].count++
      }
    }

    return buckets.filter((b) => b.count >= 0) // Keep all for visual consistency on axis
  }, [results])

  // 3. Size vs Health (Scatter Plot Data)
  const scatterData = useMemo(() => {
    return results.map((r) => {
      const sizeMB = Math.round((r.fileSize / (1024 * 1024)) * 100) / 100
      const score = r.playbackVerification?.healthScore ?? 100
      return {
        name: r.fileName,
        sizeMB,
        healthScore: r.corruptionLevel === 'unrecoverable' ? 0 : score,
        level: r.corruptionLevel
      }
    })
  }, [results])

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl p-10 py-24 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
          <Activity size={24} />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">No charts data</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Run diagnostics on a directory or file first to compile integrity diagrams.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto space-y-6 pr-1">
      <div className="grid grid-cols-2 gap-6">
        {/* Pie Chart Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col h-80">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChartIcon size={16} className="text-gray-500 stroke-[2.2]" />
            Corruption Distribution
          </h3>
          <div className="flex-1 min-h-0 relative">
            {pieData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                No values to chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.key}`} fill={COLORS[entry.key as keyof typeof COLORS] || '#ccc'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ display: 'none' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={10}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-semibold text-gray-500">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar/Histogram Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col h-80">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-gray-500 stroke-[2.2]" />
            Health Score Distribution
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  labelStyle={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Videos count">
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scatter Plot size vs health */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col h-80">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-gray-500 stroke-[2.2]" />
          Video Size vs Health Percentage
        </h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
              <XAxis
                type="number"
                dataKey="sizeMB"
                name="File Size"
                unit=" MB"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="healthScore"
                name="Health"
                unit="%"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: '#fff', fontSize: '11px' }}
                labelStyle={{ fontSize: '10px', color: '#94a3b8', display: 'none' }}
                formatter={(value, name) => {
                  if (name === 'Name') return [value, 'Video']
                  return [value, name]
                }}
              />
              <Scatter name="Videos" data={scatterData} fill="#3b82f6">
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.level as keyof typeof COLORS] || '#3b82f6'}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
