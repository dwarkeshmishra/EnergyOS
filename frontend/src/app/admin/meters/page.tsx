'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import {
  Gauge, Search, Plus, Signal, SignalZero, Activity,
  Send, Clock, X, RefreshCw, ChevronRight
} from 'lucide-react';

export default function MetersPage() {
  const [meters, setMeters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<any>(null);
  const [commands, setCommands] = useState<any[]>([]);
  const [commandType, setCommandType] = useState('ping');

  const fetchMeters = useCallback(async () => {
    try {
      const data = await apiFetch('/api/meters');
      setMeters(Array.isArray(data) ? data : data.meters || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMeters(); }, [fetchMeters]);

  const fetchCommands = async (meterId: string) => {
    try {
      const data = await apiFetch(`/api/meters/${meterId}/commands`);
      setCommands(Array.isArray(data) ? data : data.commands || []);
    } catch (err) { console.error(err); }
  };

  const sendCommand = async (meterId: string) => {
    try {
      await apiFetch(`/api/meters/${meterId}/command`, {
        method: 'POST',
        body: JSON.stringify({ command_type: commandType }),
      });
      fetchCommands(meterId);
    } catch (err: any) { alert(err.message); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await apiFetch('/api/meters', {
        method: 'POST',
        body: JSON.stringify({
          meter_id: fd.get('meter_id'),
          meter_type: fd.get('meter_type'),
          location: fd.get('location'),
          firmware_version: fd.get('firmware_version') || '1.0.0',
        }),
      });
      setShowAdd(false);
      fetchMeters();
    } catch (err: any) { alert(err.message); }
  };

  const filtered = meters.filter(m =>
    m.meter_id?.toLowerCase().includes(search.toLowerCase()) ||
    m.location?.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = meters.filter(m => m.status === 'online').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Meters</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {onlineCount}/{meters.length} online
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Register Meter
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10" placeholder="Search by meter ID or location..." />
      </div>

      {/* Meter Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Meter ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Location</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Firmware</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Last Seen</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4].map(i => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                    No meters found
                  </td>
                </tr>
              ) : (
                filtered.map(meter => (
                  <tr key={meter.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Gauge size={16} className="text-energy-500" />
                        <span className="font-medium text-gray-900 dark:text-white">{meter.meter_id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize text-gray-600 dark:text-gray-400">{meter.meter_type}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{meter.location || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {meter.status === 'online' ? (
                          <Signal size={14} className="text-green-500" />
                        ) : (
                          <SignalZero size={14} className="text-red-400" />
                        )}
                        <span className={`text-xs font-medium ${
                          meter.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                        }`}>
                          {meter.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{meter.firmware_version || '—'}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {meter.last_reading_at ? new Date(meter.last_reading_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => { setSelectedMeter(meter); fetchCommands(meter.id); }}
                        className="text-xs text-electric-600 dark:text-electric-400 hover:underline flex items-center gap-1 ml-auto"
                      >
                        Manage <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meter Detail / Command Modal */}
      {selectedMeter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Meter: {selectedMeter.meter_id}
                </h3>
                <button onClick={() => setSelectedMeter(null)} className="p-1">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${selectedMeter.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-semibold capitalize">{selectedMeter.status}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Firmware</p>
                  <p className="text-sm font-semibold">{selectedMeter.firmware_version}</p>
                </div>
              </div>

              {/* Send Command */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Send Command</h4>
                <div className="flex gap-2">
                  <select value={commandType} onChange={e => setCommandType(e.target.value)} className="input-field flex-1">
                    <option value="ping">Ping</option>
                    <option value="restart">Restart</option>
                    <option value="firmware_update">Firmware Update</option>
                    <option value="calibrate">Calibrate</option>
                    <option value="read_now">Read Now</option>
                  </select>
                  <button onClick={() => sendCommand(selectedMeter.id)} className="btn-primary flex items-center gap-1.5">
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>

              {/* Command History */}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Command History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {commands.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No commands sent yet</p>
                ) : (
                  commands.map((cmd, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <Send size={12} className="text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{cmd.command_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded ${
                          cmd.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          cmd.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-gray-100 text-gray-600'
                        }`}>{cmd.status}</span>
                        <span className="text-gray-400">{cmd.created_at ? new Date(cmd.created_at).toLocaleTimeString() : ''}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Meter Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Register Smart Meter</h3>
                <button onClick={() => setShowAdd(false)} className="p-1"><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Meter ID</label>
                  <input name="meter_id" required className="input-field" placeholder="SM-XXX-XXXX" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select name="meter_type" className="input-field">
                    <option value="smart">Smart</option>
                    <option value="ami">AMI</option>
                    <option value="prepaid">Prepaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
                  <input name="location" className="input-field" placeholder="Building A, Unit 101" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Firmware</label>
                  <input name="firmware_version" className="input-field" defaultValue="1.0.0" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Register</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
