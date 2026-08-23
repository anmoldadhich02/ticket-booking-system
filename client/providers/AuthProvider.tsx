'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganiser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res: any = await apiClient('/auth/me');
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res: any = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res?.token) {
      localStorage.setItem('auth_token', res.token);
    }
    if (res?.user) {
      setUser(res.user);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    const res: any = await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    if (res?.token) {
      localStorage.setItem('auth_token', res.token);
    }
    if (res?.user) {
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isOrganiser: user?.role === 'ORGANISER' || user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
