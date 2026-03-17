'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import type { PriceSnapshot } from '@/types'

const COLORS = ['#4ade80', '#60a5fa', '#f97316', '#a78bfa', '#f43f5e']

export default function PriceHistoryChart({ snapshots }: { snapshots: (PriceSnapshot & { platform?: { name: string } })[] }) {
  // Group by platform, keying by ISO string for correct sorting
  const platformMap = new Map<string, { name: string; data: { iso: string; label: string; min: number }[] }>()

  snapshots.forEach(s => {
    const key = s.platform_id
    const name = s.platform?.name ?? 'Unknown'
    if (!platformMap.has(key)) {
      platformMap.set(key, { name, data: [] })
    }
    platformMap.get(key)!.data.push({
      iso: s.snapshot_time,
      label: format(new Date(s.snapshot_time), 'MMM d'),
      min: Number(s.min_price_usd),
    })
  })

  // Collect unique timestamps, sort by actual date
  const isoSet = new Map<string, string>() // iso -> label
  platformMap.forEach(p => p.data.forEach(d => isoSet.set(d.iso, d.label)))
  const sortedTimes = Array.from(isoSet.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  const chartData = sortedTimes.map(([iso, label]) => {
    const row: Record<string, string | number> = { time: label }
    platformMap.forEach(p => {
      const point = p.data.find(d => d.iso === iso)
      if (point) row[p.name] = point.min
    })
    return row
  })

  const platforms = Array.from(platformMap.values())

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {platforms.map((p, i) => (
          <Line
            key={p.name}
            type="monotone"
            dataKey={p.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
