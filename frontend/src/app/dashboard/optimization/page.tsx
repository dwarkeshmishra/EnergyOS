'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import { ChartCard, EnergyBarChart } from '@/components/Charts';
import {
  Brain, Zap, Clock, TrendingDown, DollarSign, Lightbulb,
  CheckCircle, XCircle, ArrowRight, Leaf, Sun, Moon, Sunrise, Sunset
} from 'lucide-react';

const slotIcons: Record<string, React.ReactNode> = {
  'Off-Peak Night': <Moon size={16} />,
  'Morning Standard': <Sunrise size={16} />,
  'Afternoon Peak': <Sun size={16} />,
  'Evening Super Peak': <Sunset size={16} />,
  'Night Standard': <Moon size={16} />,
};

const slotColors: Record<string, string> = {
  'Off-Peak Night': 'text-green-500 bg-green-50 dark:bg-green-950/20',
  'Morning Standard': 'text-blue-500 bg-blue-50 dark:bg-blue-950/20',
  'Afternoon Peak': 'text-amber-500 bg-amber-50 dark:bg-amber-950/20',
  'Evening Super Peak': 'text-red-500 bg-red-50 dark:bg-red-950/20',
  'Night Standard': 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
};

export default function OptimizationPage() {
  const [currentRate, setCurrentRate] = useState<any>(null);
  const [cheapestSlots, setCheapestSlots] = useState<any[]>([]);
  const [billPrediction, setBillPrediction] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [todComparison, setTodComparison] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [rate, slots, bill, pat, tod, recs] = await Promise.all([
        apiFetch('/api/optimization/current-rate'),
        apiFetch('/api/optimization/cheapest-slots'),
        apiFetch('/api/optimization/predict-bill'),
        apiFetch('/api/optimization/patterns'),
        apiFetch('/api/optimization/tod-comparison'),
        apiFetch('/api/recommendations'),
      ]);
      setCurrentRate(rate);
      setCheapestSlots(slots.slots || []);
      setBillPrediction(bill);
      setPatterns(pat);
      setTodComparison(tod);
      setRecommendations(recs.filter ? recs.filter((r: any) => r.status === 'pending').slice(0, 6) : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateRecommendation = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/recommendations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div>
        <div className="w-48 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => <div key={i} className="card animate-pulse h-40" />)}
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
          <Brain size={28} className="text-electric-500" /> AI Insights & Optimization
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Smart recommendations powered by ToD tariff analysis
        </p>
      </div>

      {/* Current Rate Banner */}
      {currentRate && (
        <div className={`rounded-2xl p-5 mb-6 ${
          currentRate.is_peak
            ? 'bg-gradient-to-r from-red-500 to-orange-500'
            : 'bg-gradient-to-r from-green-500 to-emerald-500'
        } text-white`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">{currentRate.slot_name}</p>
              <p className="text-3xl font-bold mt-1">₹{currentRate.rate}/kWh</p>
              <p className="text-xs text-white/70 mt-1">
                {currentRate.hours} • {currentRate.is_peak ? 'Consider reducing usage now' : 'Good time for high-power appliances'}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-white/70">Next Rate Change</p>
                <p className="text-lg font-bold">{currentRate.next_slot?.name || 'N/A'}</p>
                <p className="text-xs text-white/80">₹{currentRate.next_slot?.rate}/kWh</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-white/70">Cheapest Today</p>
                <p className="text-lg font-bold">₹{currentRate.cheapest_rate || '4.50'}</p>
                <p className="text-xs text-white/80">10 PM - 6 AM</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Predicted Bill */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={18} className="text-energy-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Predicted Monthly Bill</h3>
          </div>
          {billPrediction && (
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ₹{parseFloat(billPrediction.predicted_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                  billPrediction.vs_last_month < 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {billPrediction.vs_last_month > 0 ? '+' : ''}{billPrediction.vs_last_month?.toFixed(1)}%
                </div>
                <span className="text-xs text-gray-400">vs last month</span>
              </div>
              {billPrediction.budget_alert && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ {billPrediction.budget_alert}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Potential Savings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Potential Savings</h3>
          </div>
          {todComparison && (
            <div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₹{parseFloat(todComparison.potential_savings || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
              </p>
              <p className="text-xs text-gray-400 mt-1">/month with optimal scheduling</p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Current cost</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">₹{parseFloat(todComparison.current_cost || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Optimized cost</span>
                  <span className="text-green-600 font-medium">₹{parseFloat(todComparison.optimized_cost || 0).toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Carbon Impact */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Carbon Footprint</h3>
          </div>
          {patterns && (
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {parseFloat(patterns.carbon_footprint_kg || 0).toFixed(0)}
                <span className="text-sm font-normal text-gray-400 ml-1">kg CO₂</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">this month</p>
              <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  🌱 {parseFloat(patterns.trees_equivalent || 0).toFixed(1)} trees needed to offset
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ToD Rate Slots */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Time-of-Day Rate Slots</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {cheapestSlots.map((slot: any, i: number) => (
            <div key={i} className={`rounded-xl p-4 ${slotColors[slot.name] || 'bg-gray-50 dark:bg-gray-800'}`}>
              <div className="flex items-center gap-2 mb-2">
                {slotIcons[slot.name] || <Clock size={16} />}
                <span className="text-xs font-medium">{slot.name}</span>
              </div>
              <p className="text-xl font-bold">₹{slot.rate}</p>
              <p className="text-xs mt-1 opacity-70">{slot.hours}</p>
              {slot.is_current && (
                <div className="mt-2 px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded text-xs font-medium text-center">
                  Active Now
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" /> Smart Recommendations
          </h3>
          <span className="text-xs text-gray-400">{recommendations.length} pending</span>
        </div>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">All caught up! No pending recommendations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec: any) => (
              <div key={rec.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className={`p-2 rounded-lg ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  rec.priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  <Lightbulb size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{rec.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rec.description}</p>
                  {rec.potential_savings && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                      Save ₹{rec.potential_savings}/month
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateRecommendation(rec.id, 'accepted')}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={() => updateRecommendation(rec.id, 'dismissed')}
                    className="p-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-colors"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Patterns */}
      {patterns?.expensive_periods && patterns.expensive_periods.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Expensive Usage Patterns Detected</h3>
          <div className="space-y-3">
            {patterns.expensive_periods.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl">
                <Clock size={16} className="text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{p.description}</p>
                  <p className="text-xs text-red-500 dark:text-red-500/70">{p.impact}</p>
                </div>
                <ArrowRight size={16} className="text-red-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
