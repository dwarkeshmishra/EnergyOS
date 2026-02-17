'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import {
  Building2, Plus, Search, Users, Gauge, Edit, Trash2, X, CheckCircle
} from 'lucide-react';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editOrg, setEditOrg] = useState<any>(null);

  const fetchOrgs = useCallback(async () => {
    try {
      const data = await apiFetch('/api/organizations');
      setOrgs(Array.isArray(data) ? data : data.organizations || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await apiFetch('/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          slug: fd.get('slug'),
          type: fd.get('type'),
          settings: { max_users: parseInt(fd.get('max_users') as string) || 50 },
        }),
      });
      setShowAdd(false);
      fetchOrgs();
    } catch (err: any) { alert(err.message); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await apiFetch(`/api/organizations/${editOrg.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: fd.get('name'),
          type: fd.get('type'),
          is_active: fd.get('is_active') === 'true',
        }),
      });
      setEditOrg(null);
      fetchOrgs();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this organization? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/organizations/${id}`, { method: 'DELETE' });
      fetchOrgs();
    } catch (err: any) { alert(err.message); }
  };

  const filtered = orgs.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{orgs.length} tenants registered</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Organization
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10" placeholder="Search organizations..."
        />
      </div>

      {/* Org Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card animate-pulse h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(org => (
            <div key={org.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{org.name}</h3>
                    <p className="text-xs text-gray-400">{org.slug}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                  org.is_active !== false
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {org.is_active !== false ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{org.user_count || 0}</p>
                  <p className="text-xs text-gray-400">Users</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{org.meter_count || 0}</p>
                  <p className="text-xs text-gray-400">Meters</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize">{org.type || 'residential'}</p>
                  <p className="text-xs text-gray-400">Type</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setEditOrg(org)} className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1">
                  <Edit size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(org.id)} className="px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modals */}
      {(showAdd || editOrg) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editOrg ? 'Edit Organization' : 'New Organization'}
                </h3>
                <button onClick={() => { setShowAdd(false); setEditOrg(null); }} className="p-1">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={editOrg ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input name="name" required className="input-field" defaultValue={editOrg?.name || ''} />
                </div>
                {!editOrg && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug</label>
                    <input name="slug" required pattern="[a-z0-9-]+" className="input-field" placeholder="my-organization" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select name="type" className="input-field" defaultValue={editOrg?.type || 'residential'}>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>
                {editOrg && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <select name="is_active" className="input-field" defaultValue={editOrg?.is_active !== false ? 'true' : 'false'}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
                {!editOrg && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Users</label>
                    <input name="max_users" type="number" className="input-field" defaultValue="50" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowAdd(false); setEditOrg(null); }} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">{editOrg ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
