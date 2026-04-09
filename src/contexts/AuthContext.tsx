'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  completeGoogleRedirectIfPresent,
  logout,
  onAuthStateChange,
  signInAsAnonymous,
  signInWithGoogle,
  signInWithGoogleRedirect,
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInAnonymously: () => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  signInWithGoogleRedirect: () => Promise<void>;
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
    // リダイレクト方式で戻ってきた場合の後処理（プロフィール同期/移行）
    completeGoogleRedirectIfPresent().catch(() => {});

    // 認証状態を監視し、未認証なら自動で匿名サインイン
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
        if (typeof window !== 'undefined' && currentUser.isAnonymous) {
          try {
            localStorage.setItem('ps_lastAnonUid', currentUser.uid);
          } catch {}
        }
        return;
      }

      try {
        // リダイレクト処理中フラグがある場合は匿名サインインを保留
        let redirectPending = false;
        try { redirectPending = sessionStorage.getItem('ps_redirect_pending') === '1'; } catch {}
        if (!redirectPending) {
          // まだ未認証の場合は匿名サインインを実行
          await signInAsAnonymous();
        }
        // onAuthStateChanged が再度発火して user がセットされる
      } catch (error) {
        console.error('❌ AuthContext: 自動匿名サインインに失敗しました:', error);
        // フォールバックして UI を利用可能にする
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignInAnonymously = async () => {
    try {
      setLoading(true);
      console.log('🔵 AuthContext: 匿名ログイン開始');
      const user = await signInAsAnonymous();
      console.log('✅ AuthContext: 匿名ログイン成功', user?.uid);
      return user;
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
      return user;
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
    signInWithGoogleRedirect: () => signInWithGoogleRedirect(),
    logout: handleLogout,
    isAnonymous: user?.isAnonymous ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
