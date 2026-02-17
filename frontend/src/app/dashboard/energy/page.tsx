'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, useWebSocket } from '@/app/providers';
import { ChartCard, EnergyAreaChart, EnergyBarChart, MultiLineChart } from '@/components/Charts';
import { Download, Clock, Zap, TrendingDown, TrendingUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

type ViewMode = 'hourly' | 'daily' | 'monthly';

export default function EnergyPage() {
  const [view, setView] = useState<ViewMode>('hourly');
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [exporting, setExporting] = useState(false);
  const { subscribe } = useWebSocket();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, hourlyRes, dailyRes, monthlyRes] = await Promise.all([
        apiFetch('/api/energy/summary'),
        apiFetch(`/api/energy/hourly?date=${format(selectedDate, 'yyyy-MM-dd')}`),
        apiFetch(`/api/energy/daily?start_date=${format(subDays(selectedDate, 29), 'yyyy-MM-dd')}&end_date=${format(selectedDate, 'yyyy-MM-dd')}`),
        apiFetch('/api/energy/monthly'),
      ]);
      setSummary(summaryRes);
      setHourlyData(hourlyRes.map((r: any) => ({
        time: `${r.hour}:00`,
        consumption: parseFloat(r.consumption_kwh || 0),
        cost: parseFloat(r.cost || 0),
      })));
      setDailyData(dailyRes.map((r: any) => ({
        date: format(new Date(r.date), 'MMM d'),
        consumption: parseFloat(r.total_kwh || 0),
        cost: parseFloat(r.total_cost || 0),
        peak: parseFloat(r.peak_kwh || 0),
        offPeak: parseFloat(r.off_peak_kwh || 0),
      })));
      setMonthlyData(monthlyRes.months?.map((m: any) => ({
        month: m.month_label || m.month,
        consumption: parseFloat(m.consumption_kwh || 0),
        cost: parseFloat(m.cost || 0),
        previousYear: parseFloat(m.previous_year_kwh || 0),
      })) || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'meter_reading') {
        // Refresh real-time summary periodically
      }
    });
    return unsub;
  }, [subscribe]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        start_date: format(subDays(selectedDate, 29), 'yyyy-MM-dd'),
        end_date: format(selectedDate, 'yyyy-MM-dd'),
      });
      const res = await fetch(`/api/energy/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `energy-report-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
      a.click();
    } catch (err) { console.error(err); }
    setExporting(false);
  };

  const navigateDate = (dir: number) => {
    if (view === 'hourly') setSelectedDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1));
    else if (view === 'daily') setSelectedDate(d => dir > 0 ? addDays(d, 30) : subDays(d, 30));
    else setSelectedDate(d => dir > 0 ? addMonths(d, 12) : subMonths(d, 12));
  };

  if (loading && !summary) {
    return (
      <div>
        <div className="w-48 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="card animate-pulse h-24" />)}
        </div>
        <div className="card animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Energy Usage</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Detailed consumption analytics & trends</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Summary Stats Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-energy-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s Usage</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {parseFloat(summary.today?.consumption_kwh || 0).toFixed(1)} <span className="text-sm font-normal text-gray-400">kWh</span>
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-amber-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Peak Demand</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {parseFloat(summary.today?.peak_kw || 0).toFixed(1)} <span className="text-sm font-normal text-gray-400">kW</span>
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              {parseFloat(summary.comparison?.change_percent || 0) < 0 
                ? <TrendingDown size={16} className="text-green-500" />
                : <TrendingUp size={16} className="text-red-500" />}
              <span className="text-xs text-gray-500 dark:text-gray-400">vs Last Month</span>
            </div>
            <p className={`text-xl font-bold ${
              parseFloat(summary.comparison?.change_percent || 0) < 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {parseFloat(summary.comparison?.change_percent || 0) > 0 ? '+' : ''}
              {parseFloat(summary.comparison?.change_percent || 0).toFixed(1)}%
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-electric-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Monthly Total</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {parseFloat(summary.monthly?.consumption_kwh || 0).toFixed(0)} <span className="text-sm font-normal text-gray-400">kWh</span>
            </p>
          </div>
        </div>
      )}

      {/* View Toggle + Date Nav */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['hourly', 'daily', 'monthly'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                view === v
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
            {view === 'hourly' && format(selectedDate, 'MMM d, yyyy')}
            {view === 'daily' && `${format(subDays(selectedDate,29), 'MMM d')} - ${format(selectedDate, 'MMM d')}` }
            {view === 'monthly' && format(selectedDate, 'yyyy')}
          </span>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        {view === 'hourly' && (
          <ChartCard title="Hourly Consumption" subtitle={format(selectedDate, 'EEEE, MMM d')}>
            <EnergyAreaChart
              data={hourlyData}
              xKey="time"
              yKey="consumption"
              color="#22c55e"
              unit=" kWh"
              height={380}
            />
          </ChartCard>
        )}
        {view === 'daily' && (
          <ChartCard title="Daily Consumption" subtitle="Last 30 days">
            <EnergyBarChart
              data={dailyData}
              xKey="date"
              yKey="consumption"
              color="#22c55e"
              unit=" kWh"
              height={380}
            />
          </ChartCard>
        )}
        {view === 'monthly' && (
          <ChartCard title="Monthly Comparison" subtitle="Current vs Previous Year">
            <MultiLineChart
              data={monthlyData}
              xKey="month"
              lines={[
                { key: 'consumption', color: '#22c55e', name: 'This Year' },
                { key: 'previousYear', color: '#94a3b8', name: 'Last Year' },
              ]}
              unit=" kWh"
              height={380}
            />
          </ChartCard>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peak vs Off-Peak */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Peak vs Off-Peak Distribution</h3>
          {dailyData.length > 0 && (() => {
            const totalPeak = dailyData.reduce((s, d) => s + d.peak, 0);
            const totalOffPeak = dailyData.reduce((s, d) => s + d.offPeak, 0);
            const total = totalPeak + totalOffPeak || 1;
            return (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">Peak Hours</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">{totalPeak.toFixed(0)} kWh</p>
                    <p className="text-xs text-red-500">{((totalPeak / total) * 100).toFixed(0)}% of total</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">Off-Peak Hours</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{totalOffPeak.toFixed(0)} kWh</p>
                    <p className="text-xs text-green-500">{((totalOffPeak / total) * 100).toFixed(0)}% of total</p>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                  <div className="bg-red-400" style={{ width: `${(totalPeak / total) * 100}%` }} />
                  <div className="bg-green-400" style={{ width: `${(totalOffPeak / total) * 100}%` }} />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Consumption Insights */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Usage Insights</h3>
          <div className="space-y-3">
            {summary?.today && (
              <>
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Average hourly consumption: <span className="font-semibold">{(parseFloat(summary.today.consumption_kwh || 0) / Math.max(new Date().getHours(), 1)).toFixed(2)} kWh</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Today&apos;s estimated cost: <span className="font-semibold">₹{parseFloat(summary.today.cost || 0).toFixed(0)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    CO₂ emitted: <span className="font-semibold">{(parseFloat(summary.today.consumption_kwh || 0) * 0.82).toFixed(1)} kg</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-energy-50 dark:bg-energy-950/20 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-energy-500" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Projected monthly: <span className="font-semibold">{parseFloat(summary.monthly?.projected_kwh || 0).toFixed(0)} kWh</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
