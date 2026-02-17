'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import {
  Cpu, Send, Search, Clock, CheckCircle, XCircle, Loader, RefreshCw
} from 'lucide-react';

export default function DevicesPage() {
  const [meters, setMeters] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [commandType, setCommandType] = useState('ping');
  const [sending, setSending] = useState(false);

  const fetchMeters = useCallback(async () => {
    try {
      const data = await apiFetch('/api/meters');
      const meterList = Array.isArray(data) ? data : data.meters || [];
      setMeters(meterList);
      if (meterList.length > 0 && !selectedMeterId) {
        setSelectedMeterId(meterList[0].id);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [selectedMeterId]);

  useEffect(() => { fetchMeters(); }, [fetchMeters]);

  useEffect(() => {
    if (selectedMeterId) {
      apiFetch(`/api/meters/${selectedMeterId}/commands`)
        .then(data => setCommands(Array.isArray(data) ? data : data.commands || []))
        .catch(() => setCommands([]));
    }
  }, [selectedMeterId]);

  const sendCommand = async () => {
    if (!selectedMeterId) return;
    setSending(true);
    try {
      await apiFetch(`/api/meters/${selectedMeterId}/command`, {
        method: 'POST',
        body: JSON.stringify({ command_type: commandType }),
      });
      const data = await apiFetch(`/api/meters/${selectedMeterId}/commands`);
      setCommands(Array.isArray(data) ? data : data.commands || []);
    } catch (err: any) { alert(err.message); }
    setSending(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} className="text-green-500" />;
      case 'failed': return <XCircle size={14} className="text-red-500" />;
      case 'pending': return <Loader size={14} className="text-amber-500 animate-spin" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const filteredCommands = commands.filter(c =>
    c.command_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Cpu size={28} className="text-electric-500" /> Device Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Remote command control & monitoring</p>
      </div>

      {/* Command Center */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Command Center</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedMeterId}
            onChange={e => setSelectedMeterId(e.target.value)}
            className="input-field flex-1"
          >
            {meters.map(m => (
              <option key={m.id} value={m.id}>
                {m.meter_id} — {m.location || 'No location'} ({m.status})
              </option>
            ))}
          </select>
          <select value={commandType} onChange={e => setCommandType(e.target.value)} className="input-field sm:w-48">
            <option value="ping">Ping</option>
            <option value="restart">Restart</option>
            <option value="firmware_update">Firmware Update</option>
            <option value="calibrate">Calibrate</option>
            <option value="read_now">Read Now</option>
            <option value="disconnect">Disconnect</option>
            <option value="reconnect">Reconnect</option>
          </select>
          <button onClick={sendCommand} disabled={sending || !selectedMeterId} className="btn-primary flex items-center gap-2">
            {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            Send Command
          </button>
        </div>
      </div>

      {/* Device Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{meters.length}</p>
          <p className="text-xs text-gray-400">Total Devices</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{meters.filter(m => m.status === 'online').length}</p>
          <p className="text-xs text-gray-400">Online</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-500">{meters.filter(m => m.status === 'offline').length}</p>
          <p className="text-xs text-gray-400">Offline</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-500">{commands.filter(c => c.status === 'pending').length}</p>
          <p className="text-xs text-gray-400">Pending Commands</p>
        </div>
      </div>

      {/* Command History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Command History</h3>
          <button onClick={() => selectedMeterId && apiFetch(`/api/meters/${selectedMeterId}/commands`).then(d => setCommands(Array.isArray(d) ? d : d.commands || []))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm" placeholder="Filter commands..." />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 dark:text-gray-400">Command</th>
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 dark:text-gray-400">Sent At</th>
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 dark:text-gray-400">Response</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommands.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">No commands found</td></tr>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <tr key={i} className="border-b dark:border-gray-800">
                    <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white">{cmd.command_type}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(cmd.status)}
                        <span className="text-xs capitalize">{cmd.status}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-400">
                      {cmd.created_at ? new Date(cmd.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500 max-w-[200px] truncate">
                      {cmd.response ? JSON.stringify(cmd.response) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
