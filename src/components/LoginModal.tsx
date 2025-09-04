'use client';

import React, { useEffect, useState } from 'react';
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
  const { signInAnonymously, signInWithGoogle, signInWithGoogleRedirect, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hooksは常に先に呼び出す（早期returnの前）
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleAnonymousLogin = async () => {
    try {
      setError(null);
      console.log('🔵 匿名ログイン開始');
      setSubmitting(true);
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
    finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (submitting) return;
    try {
      setError(null);
      console.log('🔵 Googleログイン開始');
      setSubmitting(true);
      await signInWithGoogle();
      console.log('✅ Googleログイン成功');
      onClose();
    } catch (err: any) {
      // ポップアップが閉じられた/ブロックされた場合は、自動フォールバックせずユーザーに案内
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('ログインがキャンセルされました。ポップアップが使えない場合は「リダイレクトでGoogleログイン」をお試しください。');
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setError('ポップアップがブロックされました。「リダイレクトでGoogleログイン」をお試しください。');
        return;
      }
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
    finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRedirect = async () => {
    if (submitting) return;
    setError(null);
    try {
      setSubmitting(true);
      await signInWithGoogleRedirect();
      // ここでブラウザ遷移がかかる（戻ってきたらAuthContext側で完了処理）
    } catch (e) {
      console.error('❌ Googleリダイレクトログインエラー:', e);
      setError('リダイレクト方式のログインに失敗しました。');
    }
    finally {
      setSubmitting(false);
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
          {/* 既定はポップアップ方式（以前の仕様） */}
          <button
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="ポップアップが許可されている場合はこちら"
          >
            {submitting ? 'ログイン中...' : 'Googleでログイン'}
          </button>

          {/* ポップアップが使えない環境用のリダイレクト方式 */}
          <button
            onClick={handleGoogleRedirect}
            disabled={submitting}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="ポップアップがブロックされる場合はこちら"
          >
            {submitting ? 'リダイレクト中...' : 'リダイレクトでGoogleログイン'}
          </button>

          <button
            onClick={handleAnonymousLogin}
            disabled={submitting}
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
