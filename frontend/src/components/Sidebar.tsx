'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useTheme, useWebSocket } from '@/app/providers';
import {
  LayoutDashboard, Zap, Settings, Users, Building2, CreditCard,
  Activity, Lightbulb, Bell, LogOut, Menu, X, Moon, Sun, Wifi, WifiOff,
  BarChart3, Gauge, ChevronDown, Shield, FileText, Radio
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const consumerNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Appliances', href: '/dashboard/appliances', icon: <Zap size={20} /> },
  { label: 'Energy Usage', href: '/dashboard/energy', icon: <Activity size={20} /> },
  { label: 'AI Insights', href: '/dashboard/optimization', icon: <Lightbulb size={20} /> },
  { label: 'Bills & Reports', href: '/dashboard/billing', icon: <CreditCard size={20} /> },
];

const adminNav: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: <LayoutDashboard size={20} /> },
  { label: 'Organizations', href: '/admin/organizations', icon: <Building2 size={20} />, roles: ['super_admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} /> },
  { label: 'Meters', href: '/admin/meters', icon: <Gauge size={20} /> },
  { label: 'Tariffs', href: '/admin/tariffs', icon: <FileText size={20} /> },
  { label: 'Users', href: '/admin/users', icon: <Users size={20} /> },
  { label: 'Devices', href: '/admin/devices', icon: <Radio size={20} /> },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { connected } = useWebSocket();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'super_admin' || user.role === 'tenant_admin';
  const navItems = isAdmin && pathname.startsWith('/admin') ? adminNav : consumerNav;
  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(user.role));

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-energy rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-energy-600 to-electric-600 bg-clip-text text-transparent">
              EnergyOS
            </h1>
            <p className="text-[10px] text-gray-400 -mt-0.5">Smart Energy Platform</p>
          </div>
        </Link>
      </div>

      {/* Portal Switch */}
      {isAdmin && (
        <div className="px-3 pt-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Link
              href="/dashboard"
              className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                !pathname.startsWith('/admin')
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-energy-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Consumer
            </Link>
            <Link
              href="/admin"
              className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-energy-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredNav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-energy-50 dark:bg-energy-950/50 text-energy-700 dark:text-energy-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className={isActive ? 'text-energy-600 dark:text-energy-400' : ''}>{item.icon}</span>
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-energy-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Status & Controls */}
      <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-800">
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          {connected ? (
            <>
              <Wifi size={14} className="text-energy-500" />
              <span className="text-energy-600 dark:text-energy-400">Live Connected</span>
              <div className="w-1.5 h-1.5 rounded-full bg-energy-500 animate-pulse ml-auto" />
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-gray-400" />
              <span className="text-gray-400">Disconnected</span>
            </>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
          >
            <div className="w-8 h-8 bg-gradient-energy rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'tenant_admin' ? 'Admin' : 'Consumer'}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {profileOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400">{user.email}</p>
                <p className="text-xs text-gray-400">{user.organization?.name}</p>
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 z-40">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2">
          <Menu size={22} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-gradient-energy rounded-lg flex items-center justify-center">
            <Zap className="text-white" size={16} />
          </div>
          <span className="font-bold text-energy-600">EnergyOS</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {connected && <div className="w-2 h-2 rounded-full bg-energy-500 animate-pulse" />}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900">
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileOpen(false)} className="p-1">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
