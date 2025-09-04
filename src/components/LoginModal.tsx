'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "ログインしてスケジュールに参加",
  description = "スケジュールに参加するにはログインが必要です。" 
}) => {
  const { signInAnonymously, signInWithGoogle, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnonymousLogin = async () => {
    try {
      setError(null);
      console.log('🔵 匿名ログイン開始');
      await signInAnonymously();
      console.log('✅ 匿名ログイン成功');
      onClose();
    } catch (err: unknown) {
      console.error('❌ 匿名ログインエラー:', err);
      
      let errorMessage = '匿名ログインに失敗しました。';
      
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        switch (firebaseError.code) {
          case 'auth/operation-not-allowed':
            errorMessage = '匿名認証が無効です。Firebase Consoleで匿名認証を有効にしてください。';
            break;
          default:
            errorMessage = `匿名ログインエラー: ${firebaseError.code} - ${firebaseError.message}`;
        }
      }
      
      setError(errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      console.log('🔵 Googleログイン開始');
      await signInWithGoogle();
      console.log('✅ Googleログイン成功');
      onClose();
    } catch (err: unknown) {
      console.error('❌ Googleログインエラー:', err);
      
      // エラーの詳細を表示
      let errorMessage = 'Googleログインに失敗しました。';
      
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        switch (firebaseError.code) {
          case 'auth/configuration-not-found':
            errorMessage = 'Firebase Authentication設定が正しくありません。Firebase ConsoleでGoogle認証を有効にしてください。';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'ポップアップがブロックされました。ポップアップを許可してもう一度お試しください。';
            break;
          case 'auth/popup-closed-by-user':
            errorMessage = 'ログインがキャンセルされました。';
            break;
          case 'auth/unauthorized-domain':
            errorMessage = 'このドメインは承認されていません。Firebase Consoleで承認済みドメインを確認してください。';
            break;
          default:
            errorMessage = `Googleログインエラー: ${firebaseError.code} - ${firebaseError.message}`;
        }
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'ログイン中...' : 'Googleでログイン'}
          </button>

          <button
            onClick={handleAnonymousLogin}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {loading ? 'ログイン中...' : '匿名で始める'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>匿名ログインでは、ブラウザを閉じるとデータが失われる場合があります。</p>
          <p>継続的に利用する場合はGoogleログインをお勧めします。</p>
        </div>
      </div>
    </div>
  );
};