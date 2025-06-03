import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
// import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
    // Handles new sessions or rehydrated sessions
    const handleSession = async (session: any) => {
      if (session?.user) {
        const userId = session.user.id;

        const { data: backendUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .in('role', ['admin', 'client'])
          .single();

        if (!error && backendUser) {
          const userObject = {
            id: backendUser.id,
            email: backendUser.email,
            name: backendUser.name,
            role: backendUser.role,
            clientId: backendUser.client_id,
            avatar_url: backendUser.avatar_url,
            notification_preferences: backendUser.notification_preferences,
          };
          setUser(userObject);
          localStorage.setItem('user', JSON.stringify(userObject));
        } else {
          console.error('Error fetching user profile:', error);
          await supabase.auth.signOut();
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }

      setIsLoading(false);
    };

    // Listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // On first load, fetch the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!email || !password) throw new Error('Email and password are required');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Supabase login error:', error.message);
        throw new Error(
          error.message.includes('Email not confirmed')
            ? 'Email not confirmed. Please check your email.'
            : 'Invalid email or password.'
        );
      }

      const session = data.session;
      const accessToken = session?.access_token;

      const userId = data.user.id;
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('Failed to fetch user profile');
      }

      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
        clientId: userData.client_id,
        phone: userData.phone,
        avatar_url: userData.avatar_url,
        notification_preferences: userData.notification_preferences,
        appearance_settings: userData.appearance_settings,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
        lastLogin: userData.last_login ? new Date(userData.last_login) : undefined
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };    

  return (
    <AuthContext.Provider  value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        forgotPassword,
        resetPassword,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};