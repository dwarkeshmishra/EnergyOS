'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartCard({ title, subtitle, children, action }: ChartCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Energy Area Chart ──
interface EnergyChartProps {
  data: any[];
  dataKey?: string;
  yKey?: string;
  xKey?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  unit?: string;
}

export function EnergyAreaChart({
  data, dataKey, yKey, xKey = 'hour', height = 280,
  color = '#16b364', showGrid = true
}: EnergyChartProps) {
  const key = dataKey || yKey || 'kwh';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />}
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        />
        <defs>
          <linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={key}
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${key})`}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Bar Chart ──
export function EnergyBarChart({
  data, dataKey, yKey, xKey = 'date', height = 280, color = '#3b82f6'
}: EnergyChartProps) {
  const key = dataKey || yKey || 'kwh';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Multi-line Chart ──
interface MultiLineProps {
  data: any[];
  lines: { key: string; color: string; name: string }[];
  xKey?: string;
  height?: number;
  unit?: string;
}

export function MultiLineChart({ data, lines, xKey = 'date', height = 280 }: MultiLineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        />
        <Legend />
        {lines.map(line => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            name={line.name}
            strokeWidth={2}
            dot={false}
            animationDuration={1000}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Donut Chart ──
const DEFAULT_COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#3b82f6'];

interface DonutProps {
  data: { name: string; value: number; color?: string }[];
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({ data, colors, height = 200, innerRadius = 55, outerRadius = 80 }: DonutProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
          animationDuration={1000}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color || (colors || DEFAULT_COLORS)[i % (colors || DEFAULT_COLORS).length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        />
        <Legend
          formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Chart Skeleton ──
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="card animate-pulse">
      <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="rounded-xl bg-gray-100 dark:bg-gray-800" style={{ height }} />
    </div>
  );
}
