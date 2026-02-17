'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { Zap, Eye, EyeOff, ArrowRight, Leaf } from 'lucide-react';

export default function LoginPage() {
  const { login, register, user, loading } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', organizationSlug: 'greencity'
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'super_admin' || user.role === 'tenant_admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
    setSubmitting(false);
  };

  const quickLogin = async (email: string) => {
    setError('');
    setSubmitting(true);
    try {
      await login(email, 'password123');
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-energy-200 border-t-energy-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-energy relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Zap size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">EnergyOS</h1>
              <p className="text-sm text-white/70">Smart Energy Platform</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Your Unified<br />
            Energy Command<br />
            Center
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-md">
            Monitor smart meters, control appliances, optimize with ToD tariffs, 
            and reduce your carbon footprint — all in one place.
          </p>

          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'Real-time energy monitoring & smart meter integration' },
              { icon: '🎛️', text: 'Appliance control with ON/OFF and scheduling' },
              { icon: '💰', text: 'Dynamic tariff optimization — save 10–15% on bills' },
              { icon: '🌱', text: 'Carbon footprint tracking & sustainability insights' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-white/90">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-energy rounded-xl flex items-center justify-center">
              <Zap className="text-white" size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-energy-600">EnergyOS</h1>
              <p className="text-xs text-gray-400">Smart Energy Platform</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isLogin ? 'Sign in to access your energy dashboard' : 'Join your organization\'s energy platform'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">First Name</label>
                  <input
                    type="text" required className="input-field"
                    value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Last Name</label>
                  <input
                    type="text" required className="input-field"
                    value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
              <input
                type="email" required className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required className="input-field pr-10"
                  placeholder="••••••••" minLength={8}
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Organization</label>
                <select className="input-field" value={form.organizationSlug} onChange={e => setForm({...form, organizationSlug: e.target.value})}>
                  <option value="greencity">GreenCity Apartments</option>
                  <option value="smarttech">SmartTech Office Park</option>
                  <option value="metroutility">Metro Utility Corp</option>
                </select>
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-energy-600 hover:text-energy-700 font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Quick Login (Demo) */}
          {isLogin && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 text-center mb-3">Quick Demo Login</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Consumer', email: 'rahul@greencity.com', color: 'bg-energy-50 text-energy-700 border-energy-200 dark:bg-energy-950/30 dark:text-energy-400 dark:border-energy-800' },
                  { label: 'Admin', email: 'admin@greencity.com', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' },
                  { label: 'Super Admin', email: 'superadmin@energypaas.com', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800' },
                ].map(demo => (
                  <button
                    key={demo.email}
                    onClick={() => quickLogin(demo.email)}
                    disabled={submitting}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all hover:shadow-sm ${demo.color}`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
