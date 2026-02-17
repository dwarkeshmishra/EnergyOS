'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import { ChartCard, EnergyAreaChart, EnergyBarChart, MultiLineChart, DonutChart } from '@/components/Charts';
import {
  BarChart3, TrendingUp, Zap, Clock, Activity, Download
} from 'lucide-react';

export default function AnalyticsPage() {
  const [peakLoad, setPeakLoad] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [demandResponse, setDemandResponse] = useState<any>(null);
  const [tenantComparison, setTenantComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [peak, rev, demand, tenant] = await Promise.all([
        apiFetch('/api/analytics/peak-load'),
        apiFetch('/api/analytics/revenue'),
        apiFetch('/api/analytics/demand-response'),
        apiFetch('/api/analytics/tenant-comparison').catch(() => null),
      ]);
      setPeakLoad(peak);
      setRevenue(rev);
      setDemandResponse(demand);
      setTenantComparison(tenant);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="w-48 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card animate-pulse h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={28} className="text-electric-500" /> Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Platform-wide energy and revenue analytics</p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-amber-500" />
            <span className="text-xs text-gray-400">Peak Load</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {parseFloat(peakLoad?.current_peak_kw || 0).toFixed(1)} <span className="text-sm font-normal text-gray-400">kW</span>
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <span className="text-xs text-gray-400">Revenue (MTD)</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ₹{parseFloat(revenue?.total_revenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-electric-500" />
            <span className="text-xs text-gray-400">Load Factor</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {parseFloat(demandResponse?.load_factor || 0).toFixed(0)}%
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-purple-500" />
            <span className="text-xs text-gray-400">DR Events</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {demandResponse?.events_this_month || 0}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Peak Load Trend */}
        <ChartCard title="Peak Load Trend" subtitle="Hourly peak demand">
          <EnergyAreaChart
            data={peakLoad?.hourly?.map((h: any) => ({
              hour: `${h.hour}:00`,
              load: parseFloat(h.peak_kw || h.load || 0),
            })) || []}
            xKey="hour"
            yKey="load"
            color="#f59e0b"
            unit=" kW"
            height={300}
          />
        </ChartCard>

        {/* Revenue Trend */}
        <ChartCard title="Revenue Trend" subtitle="Daily revenue last 30 days">
          <EnergyBarChart
            data={revenue?.daily?.map((d: any) => ({
              date: d.date || d.label,
              revenue: parseFloat(d.amount || d.revenue || 0),
            })) || []}
            xKey="date"
            yKey="revenue"
            color="#6366f1"
            unit=" ₹"
            height={300}
          />
        </ChartCard>

        {/* Demand Response */}
        <ChartCard title="Demand Response" subtitle="Peak vs off-peak distribution">
          <DonutChart
            data={[
              { name: 'Peak', value: parseFloat(demandResponse?.peak_percentage || 40) },
              { name: 'Standard', value: parseFloat(demandResponse?.standard_percentage || 35) },
              { name: 'Off-Peak', value: parseFloat(demandResponse?.offpeak_percentage || 25) },
            ]}
            colors={['#ef4444', '#3b82f6', '#22c55e']}
            height={300}
          />
        </ChartCard>

        {/* Tenant Comparison */}
        {tenantComparison && (
          <ChartCard title="Tenant Comparison" subtitle="Energy consumption by organization">
            <EnergyBarChart
              data={tenantComparison?.organizations?.map((o: any) => ({
                name: o.name || o.org_name,
                consumption: parseFloat(o.total_kwh || 0),
              })) || []}
              xKey="name"
              yKey="consumption"
              color="#22c55e"
              unit=" kWh"
              height={300}
            />
          </ChartCard>
        )}
      </div>
    </div>
  );
}
