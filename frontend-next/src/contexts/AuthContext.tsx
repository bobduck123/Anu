"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  nodeId?: string;
  pseudonym?: string;
  level?: number;
  points?: number;
  tier?: string;
  streakMonths?: number;
  consents?: Record<string, boolean>;
  creditsBalance?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, pseudonym?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = getCoreApiBase();

  const isAuthenticated = !!user;

  const fetchProfile = useCallback(async (token: string) => {
    const res = await fetch(`${apiBase}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  }, [apiBase]);

  const checkAuth = useCallback(async () => {
    try {
      // Check if we have a stored token
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await fetchProfile(token);
        setUser({
          id: String(profile.id ?? profile.username),
          username: profile.username,
          email: profile.email || '',
          role: profile.role,
          pseudonym: profile.pseudonym,
          level: profile.level,
          points: profile.points,
          nodeId: profile.node_id ? String(profile.node_id) : undefined,
        });
      } catch {
        const response = await fetch(`${apiBase}/auth/check-login`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData?.isAuthenticated) {
            setUser({
              id: userData.username,
              username: userData.username,
              email: '',
              role: userData.role,
            });
          } else {
            localStorage.removeItem('auth_token');
          }
        } else {
          localStorage.removeItem('auth_token');
        }
      }
    } catch {
      console.log('No valid session found');
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, fetchProfile]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      const token = data.access_token;

      // Store token
      localStorage.setItem('auth_token', token);
      try {
        const profile = await fetchProfile(token);
        setUser({
          id: String(profile.id ?? profile.username),
          username: profile.username,
          email: profile.email || '',
          role: profile.role,
          pseudonym: profile.pseudonym,
          level: profile.level,
          points: profile.points,
          nodeId: profile.node_id ? String(profile.node_id) : undefined,
        });
      } catch {
        setUser({
          id: username,
          username,
          email: '',
          role: data.role || 'participant',
        });
      }
    } catch (error) {
      console.warn('Auth service network error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, fetchProfile]);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const register = async (username: string, email: string, password: string, pseudonym?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, pseudonym: pseudonym || username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      const token = data.access_token;

      // Store token and set user (auto-login after registration)
      localStorage.setItem('auth_token', token);
      try {
        const profile = await fetchProfile(token);
        setUser({
          id: String(profile.id ?? profile.username),
          username: profile.username,
          email: profile.email || '',
          role: profile.role,
          pseudonym: profile.pseudonym,
          level: profile.level,
          points: profile.points,
          nodeId: profile.node_id ? String(profile.node_id) : undefined,
        });
      } catch {
        setUser({
          id: username,
          username,
          email,
          role: data.role || 'participant',
        });
      }
    } catch (error) {
      console.warn('Auth service network error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('auth_token');
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
