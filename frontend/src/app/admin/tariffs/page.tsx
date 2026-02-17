'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import {
  DollarSign, Plus, Edit, Trash2, X, Clock, Sun, Moon, Sunrise, Sunset
} from 'lucide-react';

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTariff, setEditTariff] = useState<any>(null);
  const [currentRate, setCurrentRate] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [data, rate] = await Promise.all([
        apiFetch('/api/tariffs'),
        apiFetch('/api/tariffs/current-rate'),
      ]);
      setTariffs(Array.isArray(data) ? data : data.tariffs || []);
      setCurrentRate(rate);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await apiFetch('/api/tariffs', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          type: fd.get('type'),
          base_rate: parseFloat(fd.get('base_rate') as string),
          rate_structure: {
            slots: [
              { name: 'Off-Peak Night', start: '22:00', end: '06:00', rate: parseFloat(fd.get('offpeak_rate') as string) || 4.5 },
              { name: 'Morning Standard', start: '06:00', end: '10:00', rate: parseFloat(fd.get('morning_rate') as string) || 6.5 },
              { name: 'Afternoon Peak', start: '10:00', end: '14:00', rate: parseFloat(fd.get('afternoon_rate') as string) || 9.0 },
              { name: 'Evening Super Peak', start: '14:00', end: '18:00', rate: parseFloat(fd.get('evening_rate') as string) || 10.5 },
              { name: 'Night Standard', start: '18:00', end: '22:00', rate: parseFloat(fd.get('night_rate') as string) || 7.0 },
            ]
          },
        }),
      });
      setShowAdd(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tariff plan?')) return;
    try {
      await apiFetch(`/api/tariffs/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const slotIcon = (name: string) => {
    if (name.includes('Night') && name.includes('Off')) return <Moon size={14} />;
    if (name.includes('Morning')) return <Sunrise size={14} />;
    if (name.includes('Afternoon')) return <Sun size={14} />;
    if (name.includes('Evening')) return <Sunset size={14} />;
    return <Moon size={14} />;
  };

  const slotColor = (name: string) => {
    if (name.includes('Off-Peak')) return 'text-green-600 bg-green-50 dark:bg-green-950/20';
    if (name.includes('Morning')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
    if (name.includes('Afternoon')) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';
    if (name.includes('Evening') || name.includes('Super')) return 'text-red-600 bg-red-50 dark:bg-red-950/20';
    return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tariff Plans</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage ToD pricing and rate structures</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Create Plan
        </button>
      </div>

      {/* Current Rate Banner */}
      {currentRate && (
        <div className={`rounded-2xl p-4 mb-6 ${
          currentRate.is_peak ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Current Active Rate</p>
              <p className="text-2xl font-bold">₹{currentRate.rate}/kWh — {currentRate.slot_name}</p>
            </div>
            <Clock size={24} className="text-white/50" />
          </div>
        </div>
      )}

      {/* Tariff Cards */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="card animate-pulse h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tariffs.map(tariff => (
            <div key={tariff.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tariff.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{tariff.type} plan • Base: ₹{tariff.base_rate}/kWh</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditTariff(tariff)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Edit size={14} className="text-gray-400" />
                  </button>
                  <button onClick={() => handleDelete(tariff.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>

              {/* Rate Slots */}
              <div className="space-y-2">
                {tariff.rate_structure?.slots?.map((slot: any, i: number) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${slotColor(slot.name)}`}>
                    <div className="flex items-center gap-2">
                      {slotIcon(slot.name)}
                      <div>
                        <p className="text-sm font-medium">{slot.name}</p>
                        <p className="text-xs opacity-70">{slot.start} - {slot.end}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">₹{slot.rate}</p>
                  </div>
                )) || (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">Flat rate: ₹{tariff.base_rate}/kWh</p>
                  </div>
                )}
              </div>

              {/* Assigned meters count */}
              <div className="mt-4 pt-3 border-t dark:border-gray-700">
                <p className="text-xs text-gray-400">
                  {tariff.assigned_meters || 0} meters assigned to this plan
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tariff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Tariff Plan</h3>
                <button onClick={() => setShowAdd(false)} className="p-1"><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plan Name</label>
                    <input name="name" required className="input-field" placeholder="Residential ToD" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                    <select name="type" className="input-field">
                      <option value="tod">Time-of-Day (ToD)</option>
                      <option value="flat">Flat Rate</option>
                      <option value="tiered">Tiered</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Base Rate (₹/kWh)</label>
                  <input name="base_rate" type="number" step="0.01" required className="input-field" defaultValue="6.50" />
                </div>
                <div className="border-t dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">ToD Rate Slots</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Off-Peak Night (10PM-6AM)', name: 'offpeak_rate', default: '4.50' },
                      { label: 'Morning Standard (6AM-10AM)', name: 'morning_rate', default: '6.50' },
                      { label: 'Afternoon Peak (10AM-2PM)', name: 'afternoon_rate', default: '9.00' },
                      { label: 'Evening Super Peak (2PM-6PM)', name: 'evening_rate', default: '10.50' },
                      { label: 'Night Standard (6PM-10PM)', name: 'night_rate', default: '7.00' },
                    ].map(slot => (
                      <div key={slot.name} className="flex items-center justify-between">
                        <label className="text-xs text-gray-600 dark:text-gray-400">{slot.label}</label>
                        <input name={slot.name} type="number" step="0.01" className="input-field w-24 text-right" defaultValue={slot.default} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Create Plan</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
