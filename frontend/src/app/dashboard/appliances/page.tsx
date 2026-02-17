'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, useWebSocket } from '@/app/providers';
import {
  Power, Snowflake, Zap, Waves, Flame, Lightbulb, Monitor, Wind,
  Thermometer, Plus, Clock, DollarSign, ChevronRight, Calendar, X
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  ac: <Snowflake size={20} />, refrigerator: <Thermometer size={20} />,
  washing_machine: <Waves size={20} />, ev_charger: <Zap size={20} />,
  water_heater: <Flame size={20} />, lighting: <Lightbulb size={20} />,
  television: <Monitor size={20} />, microwave: <Flame size={20} />,
  computer: <Monitor size={20} />, fan: <Wind size={20} />,
  other: <Power size={20} />,
};

export default function AppliancesPage() {
  const [appliances, setAppliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [costPrediction, setCostPrediction] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSchedule, setShowSchedule] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  const fetchAppliances = useCallback(async () => {
    try {
      const data = await apiFetch('/api/appliances');
      setAppliances(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppliances(); }, [fetchAppliances]);

  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'appliance_update') {
        setAppliances(prev => prev.map(a =>
          a.id === msg.data.applianceId ? { ...a, current_power_watts: msg.data.currentPowerWatts } : a
        ));
      }
      if (msg.type === 'appliance_toggle') {
        setAppliances(prev => prev.map(a =>
          a.id === msg.data.applianceId ? { ...a, is_on: msg.data.is_on } : a
        ));
      }
    });
    return unsub;
  }, [subscribe]);

  const toggleAppliance = async (id: string) => {
    setToggling(id);
    try {
      const result = await apiFetch(`/api/appliances/${id}/toggle`, { method: 'PUT' });
      setAppliances(prev => prev.map(a =>
        a.id === id ? { ...a, is_on: result.is_on, current_power_watts: result.current_power_watts } : a
      ));
    } catch (err) {
      console.error(err);
    }
    setToggling(null);
  };

  const fetchCostPrediction = async (id: string) => {
    try {
      const data = await apiFetch(`/api/appliances/${id}/predicted-cost`);
      setCostPrediction(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    try {
      await apiFetch('/api/appliances', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          type: formData.get('type'),
          rated_power_watts: parseFloat(formData.get('rated_power_watts') as string),
          avg_daily_usage_hours: parseFloat(formData.get('avg_daily_usage_hours') as string) || 1,
        }),
      });
      setShowAdd(false);
      fetchAppliances();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSchedule = async (appId: string, schedule: any) => {
    try {
      await apiFetch(`/api/appliances/${appId}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({ schedule }),
      });
      setShowSchedule(null);
      fetchAppliances();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalPower = appliances.filter(a => a.is_on).reduce((s, a) => s + parseFloat(a.current_power_watts || 0), 0);
  const activeCount = appliances.filter(a => a.is_on).length;

  if (loading) {
    return (
      <div>
        <div className="w-48 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appliances</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {activeCount} active • {(totalPower / 1000).toFixed(1)} kW total load
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Appliance
        </button>
      </div>

      {/* Appliance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {appliances.map(app => (
          <div key={app.id} className={`card group transition-all duration-300 ${
            app.is_on 
              ? 'ring-2 ring-energy-200 dark:ring-energy-800 shadow-md shadow-energy-100 dark:shadow-energy-900/20' 
              : ''
          }`}>
            {/* Top Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${
                  app.is_on 
                    ? 'bg-energy-100 text-energy-600 dark:bg-energy-900/30 dark:text-energy-400' 
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                }`}>
                  {iconMap[app.type] || <Power size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{app.name}</h3>
                  <p className="text-xs text-gray-400">{app.rated_power_watts}W rated</p>
                </div>
              </div>

              {/* ON/OFF Toggle */}
              <button
                onClick={() => toggleAppliance(app.id)}
                disabled={toggling === app.id}
                className={`toggle ${app.is_on ? 'bg-energy-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`toggle-dot ${app.is_on ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Power Display */}
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${app.is_on ? 'text-energy-600 dark:text-energy-400' : 'text-gray-300 dark:text-gray-600'}`}>
                  {app.is_on ? Math.round(app.current_power_watts || 0) : 0}
                </span>
                <span className="text-sm text-gray-400">W</span>
              </div>
              {/* Power bar */}
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${app.is_on ? 'bg-energy-500' : 'bg-gray-200'}`}
                  style={{ width: `${app.is_on ? Math.min((app.current_power_watts / app.rated_power_watts) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSchedule(app.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Calendar size={14} /> Schedule
              </button>
              <button
                onClick={() => { setSelectedApp(app); fetchCostPrediction(app.id); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-energy-600 dark:text-energy-400 bg-energy-50 dark:bg-energy-950/30 rounded-lg hover:bg-energy-100 dark:hover:bg-energy-900/30 transition-colors"
              >
                <DollarSign size={14} /> Cost
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Prediction Modal */}
      {selectedApp && costPrediction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Cost Prediction: {selectedApp.name}
                </h3>
                <button onClick={() => { setSelectedApp(null); setCostPrediction(null); }} className="p-1">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="bg-energy-50 dark:bg-energy-950/30 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-energy-800 dark:text-energy-300">
                  💡 Best time to run: <span className="font-bold">{costPrediction.recommendation?.best_time}</span>
                </p>
                <p className="text-xs text-energy-600 dark:text-energy-400 mt-1">
                  Save ₹{costPrediction.recommendation?.potential_savings} per session by switching from peak to off-peak
                </p>
              </div>

              <div className="space-y-2">
                {costPrediction.predictions?.map((pred: any) => (
                  <div key={pred.slot} className={`flex items-center justify-between p-3 rounded-xl border ${
                    pred.slot === costPrediction.recommendation?.best_time
                      ? 'border-energy-200 bg-energy-50/50 dark:border-energy-800 dark:bg-energy-950/20'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{pred.slot}</p>
                      <p className="text-xs text-gray-400">{pred.start} - {pred.end}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">₹{pred.estimated_cost}</p>
                      <p className="text-xs text-gray-400">₹{pred.rate}/kWh</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Appliance Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Appliance</h3>
                <button onClick={() => setShowAdd(false)} className="p-1"><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleAddAppliance} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input name="name" required className="input-field" placeholder="e.g., Living Room AC" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select name="type" required className="input-field">
                    <option value="ac">Air Conditioner</option>
                    <option value="refrigerator">Refrigerator</option>
                    <option value="washing_machine">Washing Machine</option>
                    <option value="ev_charger">EV Charger</option>
                    <option value="water_heater">Water Heater</option>
                    <option value="microwave">Microwave</option>
                    <option value="television">Television</option>
                    <option value="lighting">Lighting</option>
                    <option value="fan">Fan</option>
                    <option value="computer">Computer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Power (Watts)</label>
                    <input name="rated_power_watts" type="number" required min="1" className="input-field" placeholder="1500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Daily Hours</label>
                    <input name="avg_daily_usage_hours" type="number" step="0.5" className="input-field" placeholder="4" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Add Appliance</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Appliance</h3>
                <button onClick={() => setShowSchedule(null)} className="p-1"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  💡 Tip: Schedule during off-peak hours (10 PM - 6 AM) for best rates at ₹4.50/kWh
                </p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                handleSchedule(showSchedule, {
                  daily: [{ start: fd.get('start'), end: fd.get('end') }]
                });
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                    <input name="start" type="time" required className="input-field" defaultValue="22:00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                    <input name="end" type="time" required className="input-field" defaultValue="06:00" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowSchedule(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Save Schedule</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
