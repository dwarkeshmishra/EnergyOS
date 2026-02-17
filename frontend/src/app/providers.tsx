'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ── Auth Context ──
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'tenant_admin' | 'user';
  organizationId: string;
  organization?: { id: string; name: string; slug: string; type: string };
  preferences?: { darkMode: boolean; notifications: boolean; currency: string };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updatePreferences: (prefs: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, loading: true,
  login: async () => {}, register: async () => {}, logout: () => {}, updatePreferences: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Theme Context ──
interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ darkMode: false, toggleDarkMode: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── WebSocket Context ──
interface WSContextType {
  connected: boolean;
  lastMessage: any;
  subscribe: (callback: (msg: any) => void) => () => void;
}

const WSContext = createContext<WSContextType>({
  connected: false, lastMessage: null, subscribe: () => () => {},
});
export const useWebSocket = () => useContext(WSContext);

// ── API Helper ──
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch(path: string, options: any = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.text();
  }
  return res.json();
}

// ── Combined Providers ──
export function Providers({ children }: { children: React.ReactNode }) {
  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Theme
  const [darkMode, setDarkMode] = useState(false);

  // WebSocket
  const [wsConnected, setWsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);
  const [subscribers, setSubscribers] = useState<Set<(msg: any) => void>>(new Set());

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedTheme = localStorage.getItem('darkMode');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    if (savedTheme === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    setLoading(false);
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:4000`;
    const wsBase = apiBase.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws?token=${token}`;
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setWsConnected(true);
        setWsRef(ws);
        console.log('[WS] Connected');
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setLastMessage(msg);
          subscribers.forEach(cb => cb(msg));
        } catch {}
      };
      ws.onclose = () => {
        setWsConnected(false);
        setWsRef(null);
        reconnectTimeout = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [token]); // eslint-disable-line

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (regData: any) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(regData),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    wsRef?.close();
    window.location.href = '/login';
  };

  const updatePreferences = async (prefs: any) => {
    await apiFetch('/api/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences: prefs }),
    });
    if (user) {
      const updated = { ...user, preferences: prefs };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  const subscribe = useCallback((callback: (msg: any) => void) => {
    subscribers.add(callback);
    return () => { subscribers.delete(callback); };
  }, []); // eslint-disable-line

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updatePreferences }}>
      <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
        <WSContext.Provider value={{ connected: wsConnected, lastMessage, subscribe }}>
          {children}
        </WSContext.Provider>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}
