'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon: React.ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  subtitle?: string;
}

const colorMap = {
  green: 'from-energy-500 to-energy-600',
  blue: 'from-electric-500 to-electric-600',
  amber: 'from-amber-500 to-amber-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600',
};

const bgColorMap = {
  green: 'bg-energy-50 dark:bg-energy-950/30',
  blue: 'bg-blue-50 dark:bg-blue-950/30',
  amber: 'bg-amber-50 dark:bg-amber-950/30',
  red: 'bg-red-50 dark:bg-red-950/30',
  purple: 'bg-purple-50 dark:bg-purple-950/30',
};

export default function StatCard({ title, value, unit, change, icon, color = 'green', subtitle }: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${bgColorMap[color]}`}>
          <div className={`bg-gradient-to-br ${colorMap[color]} bg-clip-text text-transparent`}>
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
            change > 0 ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
            : change < 0 ? 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
            : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && <span className="text-sm text-gray-400">{unit}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Loading Skeleton ──
export function StatCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="w-14 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="w-28 h-7 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}
