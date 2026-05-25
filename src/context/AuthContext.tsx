import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  isRecoveringPassword: boolean;
  resetPasswordForEmail: (email: string) => Promise<AuthError | null>;
  updatePassword: (password: string) => Promise<AuthError | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  const isPlaceholder = !import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project.supabase.co');

  useEffect(() => {
    let unsubscribeFn: (() => void) | undefined;

    const initAuth = async () => {
      if (isPlaceholder) {
        const mockSession = localStorage.getItem('myranor_mock_session');
        if (mockSession) {
          try {
            setSession(JSON.parse(mockSession));
          } catch (e) {
            console.error('Error parsing mock session:', e);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.warn('Supabase getSession failed, falling back to mock session:', err);
        const mockSession = localStorage.getItem('myranor_mock_session');
        if (mockSession) {
          try {
            setSession(JSON.parse(mockSession));
          } catch (e) {}
        }
      } finally {
        setLoading(false);
      }

      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          setSession(session);
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveringPassword(true);
          }
        });
        unsubscribeFn = () => subscription.unsubscribe();
      } catch (e) {
        console.warn('Could not subscribe to auth state changes:', e);
      }
    };

    initAuth();
    return () => {
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [isPlaceholder]);

  const signIn = async (email: string, password: string) => {
    if (isPlaceholder) {
      const mockSession = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: {
          id: 'mock-user-id',
          email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {}
        }
      } as any as Session;
      
      setSession(mockSession);
      localStorage.setItem('myranor_mock_session', JSON.stringify(mockSession));
      return null;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error;
    } catch (err: any) {
      console.warn('Network error during signIn. Falling back to local offline mode.', err);
      const mockSession = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: {
          id: 'mock-user-id',
          email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {}
        }
      } as any as Session;
      
      setSession(mockSession);
      localStorage.setItem('myranor_mock_session', JSON.stringify(mockSession));
      return null;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (isPlaceholder) {
      const mockSession = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: {
          id: 'mock-user-id',
          email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {}
        }
      } as any as Session;
      
      setSession(mockSession);
      localStorage.setItem('myranor_mock_session', JSON.stringify(mockSession));
      return null;
    }

    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return error;
    } catch (err: any) {
      console.warn('Network error during signUp. Falling back to local offline mode.', err);
      const mockSession = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: {
          id: 'mock-user-id',
          email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {}
        }
      } as any as Session;
      
      setSession(mockSession);
      localStorage.setItem('myranor_mock_session', JSON.stringify(mockSession));
      return null;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('myranor_mock_session');
    setSession(null);
    if (!isPlaceholder) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut failed:', err);
      }
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    if (isPlaceholder) return null;
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return error;
    } catch (err: any) {
      return { message: 'Offline-Modus aktiv: Passwort-Zurücksetzung übersprungen.' } as any;
    }
  };

  const updatePassword = async (password: string) => {
    if (isPlaceholder) {
      setIsRecoveringPassword(false);
      return null;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        setIsRecoveringPassword(false);
      }
      return error;
    } catch (err: any) {
      setIsRecoveringPassword(false);
      return null;
    }
  };

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    isRecoveringPassword,
    resetPasswordForEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
