'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import { ChartCard, EnergyBarChart, MultiLineChart } from '@/components/Charts';
import {
  Receipt, Download, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, Clock, ChevronRight, CreditCard, FileText, Zap
} from 'lucide-react';
import { format, subMonths } from 'date-fns';

export default function BillingPage() {
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'forecast'>('current');

  const fetchData = useCallback(async () => {
    try {
      const [bill, hist, fc] = await Promise.all([
        apiFetch('/api/billing/current'),
        apiFetch('/api/billing/history'),
        apiFetch('/api/billing/forecast'),
      ]);
      setCurrentBill(bill);
      setHistory(hist || []);
      setForecast(fc);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="w-48 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="card animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills & Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Billing, forecasts, and financial tracking</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {([
          { key: 'current', label: 'Current Bill', icon: Receipt },
          { key: 'history', label: 'History', icon: Calendar },
          { key: 'forecast', label: 'Forecast', icon: TrendingUp },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Current Bill Tab */}
      {activeTab === 'current' && currentBill && (
        <div className="space-y-4">
          {/* Bill Summary Card */}
          <div className="card bg-gradient-to-br from-energy-50 to-electric-50 dark:from-energy-950/30 dark:to-electric-950/30 border border-energy-100 dark:border-energy-900/50">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Period Bill</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  ₹{parseFloat(currentBill.total_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {currentBill.period_start ? format(new Date(currentBill.period_start), 'MMM d') : ''} —{' '}
                  {currentBill.period_end ? format(new Date(currentBill.period_end), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl px-4 py-3 text-center">
                  <Zap size={16} className="text-energy-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{parseFloat(currentBill.total_kwh || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-400">kWh Used</p>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl px-4 py-3 text-center">
                  <Clock size={16} className="text-amber-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{currentBill.days_remaining || '—'}</p>
                  <p className="text-xs text-gray-400">Days Left</p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bill Breakdown</h3>
              <div className="space-y-3">
                {currentBill.breakdown?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.type === 'peak' ? 'bg-red-400' :
                        item.type === 'off_peak' ? 'bg-green-400' :
                        item.type === 'standard' ? 'bg-blue-400' :
                        'bg-gray-300'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.kwh} kWh × ₹{item.rate}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{parseFloat(item.amount || 0).toFixed(0)}</p>
                  </div>
                ))}
                {currentBill.taxes && (
                  <div className="border-t dark:border-gray-700 pt-3 mt-3 space-y-2">
                    {currentBill.taxes.map((tax: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{tax.label}</span>
                        <span className="text-gray-700 dark:text-gray-300">₹{parseFloat(tax.amount || 0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Savings Opportunity */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Savings Opportunity</h3>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  💰 By shifting peak usage to off-peak, you could save:
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  ₹{parseFloat(currentBill.potential_savings || 0).toFixed(0)}/month
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Peak usage</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {parseFloat(currentBill.peak_percentage || 40).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Off-Peak usage</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {parseFloat(currentBill.offpeak_percentage || 60).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Projected End-of-Month */}
          {currentBill.projection && (
            <div className="card">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">End-of-Month Projection</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    At current rate, your bill is projected to reach{' '}
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{parseFloat(currentBill.projection.amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </span>
                    {' '}by month end.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <ChartCard title="Monthly Bill Trend" subtitle="Last 12 months">
            <EnergyBarChart
              data={history.map(h => ({
                month: h.month_label || format(new Date(h.billing_period_start || h.month), 'MMM'),
                amount: parseFloat(h.total_amount || 0),
              }))}
              xKey="month"
              yKey="amount"
              color="#22c55e"
              unit=" ₹"
              height={300}
            />
          </ChartCard>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Billing History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Period</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Usage (kWh)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Avg Rate</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((bill, i) => (
                    <tr key={i} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {bill.month_label || (bill.billing_period_start ? format(new Date(bill.billing_period_start), 'MMM yyyy') : '—')}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                        {parseFloat(bill.total_kwh || 0).toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(bill.total_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        ₹{(parseFloat(bill.total_amount || 0) / Math.max(parseFloat(bill.total_kwh || 1), 1)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          bill.status === 'paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : bill.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {bill.status || 'generated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && forecast && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecast.months?.map((m: any, i: number) => (
              <div key={i} className={`card ${i === 0 ? 'ring-2 ring-energy-200 dark:ring-energy-800' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.month_label}</h3>
                  {i === 0 && <span className="text-xs bg-energy-100 text-energy-700 dark:bg-energy-900/30 dark:text-energy-400 px-2 py-0.5 rounded">Next</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{parseFloat(m.predicted_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">Predicted</p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{parseFloat(m.predicted_kwh || 0).toFixed(0)} kWh</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">vs Avg</p>
                    <p className={`text-sm font-semibold ${
                      parseFloat(m.vs_average || 0) < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(m.vs_average || 0) > 0 ? '+' : ''}{parseFloat(m.vs_average || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
                {m.seasonal_note && (
                  <p className="text-xs text-gray-400 mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    📌 {m.seasonal_note}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Budget Alert Section */}
          {forecast.budget_alerts && forecast.budget_alerts.length > 0 && (
            <div className="card border border-amber-200 dark:border-amber-800/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Budget Alerts</h3>
              </div>
              <div className="space-y-2">
                {forecast.budget_alerts.map((alert: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forecast Comparison Chart */}
          <ChartCard title="3-Month Forecast" subtitle="Predicted vs Historical">
            <EnergyBarChart
              data={forecast.months?.map((m: any) => ({
                month: m.month_label || m.month,
                predicted: parseFloat(m.predicted_amount || 0),
                historical: parseFloat(m.last_year_amount || 0),
              })) || []}
              xKey="month"
              yKey="predicted"
              color="#6366f1"
              unit=" ₹"
              height={300}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
