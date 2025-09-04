'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signInAsAnonymous, signInWithGoogle, logout } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInAnonymously = async () => {
    try {
      setLoading(true);
      console.log('🔵 AuthContext: 匿名ログイン開始');
      const user = await signInAsAnonymous();
      console.log('✅ AuthContext: 匿名ログイン成功', user?.uid);
    } catch (error: unknown) {
      console.error('❌ AuthContext: 匿名ログインエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('🔵 AuthContext: Googleログイン開始');
      const user = await signInWithGoogle();
      console.log('✅ AuthContext: Googleログイン成功', user?.uid);
    } catch (error: unknown) {
      console.error('❌ AuthContext: Googleログインエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInAnonymously: handleSignInAnonymously,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    isAnonymous: user?.isAnonymous ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};