'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import { ChartCard, EnergyAreaChart, EnergyBarChart, MultiLineChart, DonutChart } from '@/components/Charts';
import {
  BarChart3, TrendingUp, Zap, Clock, Activity, Download
} from 'lucide-react';

// ── Demo fallback data ──
const demoPeakLoad = {
  hourly_profile: Array.from({ length: 24 }, (_, h) => {
    const base = h < 6 ? 15 : h < 9 ? 45 : h < 12 ? 78 : h < 17 ? 55 : h < 22 ? 82 : 25;
    return { hour: h, avg_power: (base + Math.random() * 15) * 1000, peak_power: (base + 10 + Math.random() * 20) * 1000 };
  }),
  peak_hour: 18,
  peak_demand_watts: 92400,
};

const demoRevenue = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - 11 + i);
  const base = 35000 + Math.sin(i * 0.7) * 12000 + i * 1500;
  return { month: d.toISOString(), revenue: Math.round(base + Math.random() * 5000), energy_kwh: Math.round(base / 7), active_meters: 6 };
});

const demoDemandResponse = {
  distribution: [
    { tariff_type: 'peak', total_kwh: 1240, percentage: 38 },
    { tariff_type: 'standard', total_kwh: 1150, percentage: 35 },
    { tariff_type: 'off_peak', total_kwh: 890, percentage: 27 },
  ],
  total_kwh: 3280,
  peak_ratio: 38,
};

const demoTenantComparison = [
  { name: 'GreenCity Apartments', meter_count: 3, user_count: 4, month_kwh: 2450, month_revenue: 18200 },
  { name: 'SmartTech Office Park', meter_count: 2, user_count: 2, month_kwh: 3100, month_revenue: 26350 },
  { name: 'Metro Utility Corp', meter_count: 1, user_count: 1, month_kwh: 1800, month_revenue: 12600 },
];

export default function AnalyticsPage() {
  const [peakLoad, setPeakLoad] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [demandResponse, setDemandResponse] = useState<any>(null);
  const [tenantComparison, setTenantComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [peak, rev, demand, tenant] = await Promise.all([
        apiFetch('/api/analytics/peak-load').catch(() => null),
        apiFetch('/api/analytics/revenue').catch(() => null),
        apiFetch('/api/analytics/demand-response').catch(() => null),
        apiFetch('/api/analytics/tenant-comparison').catch(() => null),
      ]);
      setPeakLoad(peak || demoPeakLoad);
      setRevenue(rev || demoRevenue);
      setDemandResponse(demand || demoDemandResponse);
      setTenantComparison(tenant || demoTenantComparison);
    } catch (err) {
      console.error(err);
      setPeakLoad(demoPeakLoad);
      setRevenue(demoRevenue);
      setDemandResponse(demoDemandResponse);
      setTenantComparison(demoTenantComparison);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Normalize data from different backend response shapes
  const peakHourlyData = (peakLoad?.hourly || peakLoad?.hourly_profile || demoPeakLoad.hourly_profile).map((h: any) => ({
    hour: `${h.hour}:00`,
    load: parseFloat(h.peak_kw || h.peak_power ? (parseFloat(h.peak_power) / 1000).toFixed(1) : h.load || 0),
  }));

  const revenueData = (() => {
    // Backend returns flat array from /revenue with { month, revenue, energy_kwh }
    const raw = revenue?.daily || (Array.isArray(revenue) ? revenue : demoRevenue);
    return raw.map((d: any) => ({
      date: d.date || d.label || (d.month ? new Date(d.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : ''),
      revenue: parseFloat(d.amount || d.revenue || 0),
    }));
  })();

  const totalRevenue = (() => {
    if (revenue?.total_revenue) return revenue.total_revenue;
    const raw = Array.isArray(revenue) ? revenue : demoRevenue;
    return raw.reduce((s: number, r: any) => s + parseFloat(r.revenue || r.amount || 0), 0);
  })();

  const demandDist = demandResponse?.distribution || demoDemandResponse.distribution;
  const peakPct = demandDist.find((d: any) => d.tariff_type === 'peak')?.percentage || demandResponse?.peak_percentage || 38;
  const stdPct = demandDist.find((d: any) => d.tariff_type === 'standard')?.percentage || demandResponse?.standard_percentage || 35;
  const offPeakPct = demandDist.find((d: any) => d.tariff_type?.includes('off'))?.percentage || demandResponse?.offpeak_percentage || 27;

  const tenantData = (() => {
    const raw = tenantComparison?.organizations || (Array.isArray(tenantComparison) ? tenantComparison : demoTenantComparison);
    return raw.map((o: any) => ({
      name: o.name || o.org_name,
      consumption: parseFloat(o.total_kwh || o.month_kwh || 0),
    }));
  })();

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
            {((peakLoad?.peak_demand_watts || demoPeakLoad.peak_demand_watts) / 1000).toFixed(1)} <span className="text-sm font-normal text-gray-400">kW</span>
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <span className="text-xs text-gray-400">Revenue (MTD)</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ₹{parseFloat(String(totalRevenue)).toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-electric-500" />
            <span className="text-xs text-gray-400">Load Factor</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {parseFloat(demandResponse?.load_factor || '72').toFixed(0)}%
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-purple-500" />
            <span className="text-xs text-gray-400">DR Events</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {demandResponse?.events_this_month || 12}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Peak Load Trend */}
        <ChartCard title="Peak Load Trend" subtitle="Hourly peak demand">
          <EnergyAreaChart
            data={peakHourlyData}
            xKey="hour"
            yKey="load"
            color="#f59e0b"
            unit=" kW"
            height={300}
          />
        </ChartCard>

        {/* Revenue Trend */}
        <ChartCard title="Revenue Trend" subtitle="Monthly revenue (last 12 months)">
          <EnergyBarChart
            data={revenueData}
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
              { name: 'Peak', value: parseFloat(String(peakPct)) },
              { name: 'Standard', value: parseFloat(String(stdPct)) },
              { name: 'Off-Peak', value: parseFloat(String(offPeakPct)) },
            ]}
            colors={['#ef4444', '#3b82f6', '#22c55e']}
            height={300}
          />
        </ChartCard>

        {/* Tenant Comparison */}
        <ChartCard title="Tenant Comparison" subtitle="Energy consumption by organization">
          <EnergyBarChart
            data={tenantData}
            xKey="name"
            yKey="consumption"
            color="#22c55e"
            unit=" kWh"
            height={300}
          />
        </ChartCard>
      </div>
    </div>
  );
}
