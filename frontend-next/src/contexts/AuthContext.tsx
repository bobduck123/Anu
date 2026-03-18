"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, pseudonym?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const metadata = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    username: metadata.username || metadata.pseudonym || supabaseUser.email?.split('@')[0] || 'user',
    email: supabaseUser.email || '',
    role: metadata.role || 'participant',
    pseudonym: metadata.pseudonym || metadata.username,
    isAdmin: metadata.is_admin === true || metadata.role === 'admin',
    avatar: metadata.avatar_url,
    nodeId: metadata.node_id,
    level: metadata.level,
    points: metadata.points,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin === true || user?.role === 'admin';

  const checkAuth = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error || !authUser) {
        setUser(null);
        setSupabaseUser(null);
        return;
      }

      setSupabaseUser(authUser);
      setUser(mapSupabaseUser(authUser));
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      setSupabaseUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();
    
    // Check initial session
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user);
          setUser(mapSupabaseUser(session.user));
        } else {
          setSupabaseUser(null);
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        setSupabaseUser(data.user);
        setUser(mapSupabaseUser(data.user));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, pseudonym?: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/profile`,
          data: {
            username,
            pseudonym: pseudonym || username,
            role: 'participant',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // If email confirmation is disabled, user is immediately logged in
      if (data.user && data.session) {
        setSupabaseUser(data.user);
        setUser(mapSupabaseUser(data.user));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    supabaseUser,
    isLoading,
    isAuthenticated,
    isAdmin,
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
