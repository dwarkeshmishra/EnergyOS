'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useWebSocket, apiFetch } from '@/app/providers';
import StatCard, { StatCardSkeleton } from '@/components/StatCard';
import { ChartCard, EnergyAreaChart, DonutChart } from '@/components/Charts';
import {
  Zap, DollarSign, Leaf, Activity, Gauge, TrendingDown,
  Clock, AlertTriangle, Lightbulb, Power, Sun, Moon
} from 'lucide-react';

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [summary, setSummary] = useState<any>(null);
  const [realtime, setRealtime] = useState<any>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [currentRate, setCurrentRate] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, realtimeData, hourlyData, rateData, recsData] = await Promise.all([
        apiFetch('/api/energy/summary'),
        apiFetch('/api/energy/realtime'),
        apiFetch('/api/energy/hourly?days=1'),
        apiFetch('/api/optimization/current-rate'),
        apiFetch('/api/recommendations'),
      ]);
      setSummary(summaryData);
      setRealtime(realtimeData);
      setHourly(hourlyData.map((h: any) => ({
        hour: new Date(h.hour).getHours() + ':00',
        kwh: parseFloat(h.kwh).toFixed(2),
        cost: parseFloat(h.cost).toFixed(2),
      })));
      setCurrentRate(rateData);
      setRecommendations(recsData.slice(0, 4));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WebSocket real-time updates
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'meter_reading') {
        setRealtime((prev: any) => prev ? {
          ...prev,
          current_power_watts: msg.data.powerWatts,
          current_power_kw: (msg.data.powerWatts / 1000).toFixed(2),
        } : prev);
      }
    });
    return unsub;
  }, [subscribe]);

  const hour = new Date().getHours();
  const isPeak = (hour >= 9 && hour < 12) || (hour >= 17 && hour < 22);
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="w-48 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const tarifBreakdown = [
    { name: 'Peak', value: parseFloat(summary?.this_month?.kwh || 0) * 0.35, color: '#ef4444' },
    { name: 'Standard', value: parseFloat(summary?.this_month?.kwh || 0) * 0.40, color: '#f59e0b' },
    { name: 'Off-Peak', value: parseFloat(summary?.this_month?.kwh || 0) * 0.25, color: '#16b364' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here's your energy overview • {user?.organization?.name}
        </p>
      </div>

      {/* Current Rate Banner */}
      {currentRate && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between ${
          isPeak 
            ? 'bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 border border-red-100 dark:border-red-900'
            : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-900'
        }`}>
          <div className="flex items-center gap-3">
            {isPeak ? <Sun className="text-amber-500" size={22} /> : <Moon className="text-energy-500" size={22} />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isPeak ? '⚠️ Peak Hours Active' : '✅ Off-Peak / Standard Rate'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Current rate: ₹{currentRate.rate}/kWh • {currentRate.slot_name}
              </p>
            </div>
          </div>
          <div className={`text-2xl font-bold ${isPeak ? 'text-red-600 dark:text-red-400' : 'text-energy-600 dark:text-energy-400'}`}>
            ₹{currentRate.rate}
            <span className="text-sm font-normal text-gray-400">/kWh</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Current Power"
          value={realtime?.current_power_kw || 0}
          unit="kW"
          icon={<Zap size={20} className="text-energy-600" />}
          color="green"
          subtitle={`${realtime?.current_power_watts || 0}W live`}
        />
        <StatCard
          title="Today's Usage"
          value={realtime?.today_kwh || 0}
          unit="kWh"
          icon={<Activity size={20} className="text-blue-600" />}
          color="blue"
          subtitle={`₹${realtime?.today_cost || 0} estimated`}
        />
        <StatCard
          title="Monthly Bill"
          value={`₹${summary?.projected_monthly_cost || 0}`}
          icon={<DollarSign size={20} className="text-amber-600" />}
          color="amber"
          subtitle="Projected this month"
          change={summary?.savings_indicator ? -Math.abs(summary.savings_indicator) : undefined}
        />
        <StatCard
          title="Carbon Footprint"
          value={summary?.this_month?.carbon_kg || 0}
          unit="kg CO₂"
          icon={<Leaf size={20} className="text-energy-600" />}
          color="green"
          subtitle={`≈ ${Math.round((summary?.this_month?.carbon_kg || 0) / 21.77 * 10) / 10} trees needed`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <ChartCard title="Today's Energy Consumption" subtitle="Hourly kWh usage">
            <EnergyAreaChart data={hourly} dataKey="kwh" xKey="hour" color="#16b364" />
          </ChartCard>
        </div>
        <ChartCard title="Tariff Distribution" subtitle="This month's usage by rate">
          <DonutChart data={tarifBreakdown} />
          <div className="mt-4 space-y-2">
            {tarifBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{item.value.toFixed(1)} kWh</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Appliances + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Appliances */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Appliance Status</h3>
            <a href="/dashboard/appliances" className="text-xs text-energy-600 hover:underline">View all →</a>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Power size={18} className="text-energy-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Active Appliances</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {summary?.appliances?.active || 0} / {summary?.appliances?.total || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Gauge size={18} className="text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Active Load</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {((summary?.appliances?.total_power_watts || 0) / 1000).toFixed(1)} kW
              </span>
            </div>
          </div>
        </div>

        {/* Smart Recommendations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" /> Smart Recommendations
            </h3>
            <a href="/dashboard/optimization" className="text-xs text-energy-600 hover:underline">View all →</a>
          </div>
          <div className="space-y-2">
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No recommendations yet</p>
            ) : (
              recommendations.map((rec: any) => (
                <div key={rec.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                      rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{rec.title}</p>
                      {rec.potential_savings_cost > 0 && (
                        <p className="text-xs text-energy-600 dark:text-energy-400 mt-0.5">
                          Save ₹{rec.potential_savings_cost}/month
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Month comparison footer */}
      {summary && (
        <div className="mt-6 p-4 card bg-gradient-card dark:bg-gradient-card-dark">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{summary.this_month.kwh} kWh</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last Month</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{summary.last_month.kwh} kWh</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">This Month Cost</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">₹{summary.this_month.cost}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Savings Trend</p>
              <p className={`text-lg font-bold ${summary.savings_indicator > 0 ? 'text-energy-600' : 'text-red-600'}`}>
                {summary.savings_indicator > 0 ? '↓' : '↑'} {Math.abs(summary.savings_indicator)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
