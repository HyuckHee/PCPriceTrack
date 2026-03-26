'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PriceRecord {
  price: string;
  recordedAt: string;
  store: { id: string; name: string };
}

interface ChartDataPoint {
  date: string;
  [storeName: string]: string | number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PriceHistoryChart({ records }: { records: PriceRecord[] }) {
  if (records.length === 0) {
    return <p className="text-gray-400 text-sm">No price history available.</p>;
  }

  // Group by date (day) and store
  const storeNames = [...new Set(records.map((r) => r.store.name))];

  const byDate = new Map<string, ChartDataPoint>();
  for (const r of records) {
    const date = new Date(r.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDate.has(date)) byDate.set(date, { date });
    const point = byDate.get(date)!;
    const price = parseFloat(r.price);
    // Keep lowest price for the day per store
    if (!point[r.store.name] || (point[r.store.name] as number) > price) {
      point[r.store.name] = price;
    }
  }

  const data = [...byDate.values()].reverse();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickFormatter={(v) => `$${v}`}
          width={60}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#e5e7eb' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
        />
        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
        {storeNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
