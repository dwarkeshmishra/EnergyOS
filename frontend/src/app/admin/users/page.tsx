'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/app/providers';
import {
  Users, Plus, Search, Edit, Trash2, X, Shield, ShieldCheck, User
} from 'lucide-react';

const roleLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <ShieldCheck size={14} /> },
  tenant_admin: { label: 'Tenant Admin', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Shield size={14} /> },
  user: { label: 'User', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: <User size={14} /> },
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/users');
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          password: fd.get('password'),
          role: fd.get('role'),
        }),
      });
      setShowAdd(false);
      fetchUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      fetchUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) { alert(err.message); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{users.length} users across all tenants</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10" placeholder="Search by name or email..." />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Organization</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Joined</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}><td colSpan={6} className="py-4 px-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">No users found</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-energy-100 dark:bg-energy-900/30 flex items-center justify-center text-sm font-bold text-energy-600 dark:text-energy-400">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${roleLabels[u.role]?.color || roleLabels.user.color}`}>
                        {roleLabels[u.role]?.icon} {roleLabels[u.role]?.label || u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">{u.organization_name || u.org_name || '—'}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.is_active !== false
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <select
                          value={u.role}
                          onChange={e => handleUpdateRole(u.id, e.target.value)}
                          className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="tenant_admin">Tenant Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New User</h3>
                <button onClick={() => setShowAdd(false)} className="p-1"><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
                  <input name="name" required className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                  <input name="email" type="email" required className="input-field" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password</label>
                  <input name="password" type="password" required minLength={6} className="input-field" placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
                  <select name="role" className="input-field">
                    <option value="user">User</option>
                    <option value="tenant_admin">Tenant Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Create User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
