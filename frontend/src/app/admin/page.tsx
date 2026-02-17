'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, useAuth } from '@/app/providers';
import StatCard from '@/components/StatCard';
import { ChartCard, EnergyAreaChart, EnergyBarChart, DonutChart } from '@/components/Charts';
import {
  Building2, Users, Gauge, Zap, DollarSign, Activity,
  AlertTriangle, TrendingUp, Server, Shield
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, alertsRes] = await Promise.all([
        apiFetch('/api/analytics/overview'),
        apiFetch('/api/alerts?limit=5'),
      ]);
      setAnalytics(analyticsRes);
      setStats(analyticsRes.summary || analyticsRes);
      setRecentAlerts(Array.isArray(alertsRes) ? alertsRes.slice(0, 5) : alertsRes.alerts?.slice(0, 5) || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="w-64 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
        <div className="card animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield size={28} className="text-electric-500" /> Admin Portal
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {user?.role === 'super_admin' ? 'Platform-wide' : 'Organization'} overview & management
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Organizations"
          value={stats?.total_organizations || stats?.organizations || '—'}
          icon={<Building2 size={20} />}
          color="blue"
        />
        <StatCard
          title="Total Users"
          value={stats?.total_users || stats?.users || '—'}
          icon={<Users size={20} />}
          color="green"
        />
        <StatCard
          title="Active Meters"
          value={stats?.active_meters || stats?.meters || '—'}
          icon={<Gauge size={20} />}
          color="purple"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${parseFloat(stats?.total_revenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`}
          icon={<DollarSign size={20} />}
          color="amber"
        />
      </div>

      {/* Grid: Charts + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Energy Trend */}
        <div className="lg:col-span-2">
          <ChartCard title="Platform Energy Consumption" subtitle="Last 30 days aggregated">
            <EnergyAreaChart
              data={analytics?.energy_trend?.map((d: any) => ({
                date: d.date || d.label,
                consumption: parseFloat(d.total_kwh || d.value || 0),
              })) || []}
              xKey="date"
              yKey="consumption"
              color="#22c55e"
              unit=" kWh"
              height={300}
            />
          </ChartCard>
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Recent Alerts
            </h3>
            <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
              {recentAlerts.length}
            </span>
          </div>
          <div className="space-y-3">
            {recentAlerts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No recent alerts</p>
            )}
            {recentAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500' :
                  alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{alert.title || alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{alert.type} • {alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Org Distribution + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Organization Breakdown */}
        {analytics?.org_breakdown && (
          <ChartCard title="Organization Distribution" subtitle="Users per organization">
            <DonutChart
              data={analytics.org_breakdown.map((o: any) => ({
                name: o.name || o.org_name,
                value: parseInt(o.user_count || o.users || 0),
              }))}
              colors={['#22c55e', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4']}
              height={300}
            />
          </ChartCard>
        )}

        {/* System Status */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Server size={16} className="text-energy-500" /> System Status
          </h3>
          <div className="space-y-3">
            {[
              { label: 'API Server', status: 'online', uptime: '99.9%' },
              { label: 'WebSocket', status: 'online', uptime: '99.8%' },
              { label: 'Database', status: 'online', uptime: '99.9%' },
              { label: 'IoT Simulator', status: 'online', uptime: '99.7%' },
            ].map((service, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    service.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{service.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{service.uptime}</span>
                  <span className={`text-xs font-medium ${
                    service.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                  }`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
