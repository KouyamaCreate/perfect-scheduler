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
      const user = await signInWithGoogle();
      if (user) {
        console.log('✅ Googleログイン成功');
        onClose();
      }
    } catch (err: unknown) {
      // ポップアップが閉じられた/ブロックされた場合は、自動フォールバックせずユーザーに案内
      const code = (typeof err === 'object' && err && 'code' in err) ? (err as { code?: string }).code : undefined;
      if (code === 'auth/popup-closed-by-user') {
        setError('ログインがキャンセルされました。ポップアップが使えない場合は「リダイレクトでGoogleログイン」をお試しください。');
        return;
      }
      if (code === 'auth/popup-blocked') {
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
    } catch (err) {
      console.error('❌ Googleリダイレクトログインエラー:', err);
      setError('リダイレクト方式のログインに失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,50,120,0.24)] px-4 backdrop-blur-[2px]">
      <div className="surface-card w-full max-w-md rounded-2xl p-6">
        <div className="text-center mb-6">
          <p className="eyebrow mb-2">Meetrace</p>
          <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">{title}</h2>
          <p className="text-[var(--foreground-muted)]">{description}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#dc1e32] bg-[rgba(220,30,50,0.08)] p-3 text-sm text-[#a51428]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* 既定はポップアップ方式（以前の仕様） */}
          <button
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="btn btn-primary w-full"
            title="ポップアップが許可されている場合はこちら"
          >
            {submitting ? 'ログイン中...' : 'Googleでログイン'}
          </button>

          <button
            onClick={handleGoogleRedirect}
            disabled={submitting}
            className="btn btn-secondary w-full"
            title="ポップアップが使えない場合はこちら"
          >
            {submitting ? 'リダイレクト中...' : 'リダイレクトでGoogleログイン'}
          </button>

          <button
            onClick={handleAnonymousLogin}
            disabled={submitting}
            className="btn w-full border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary-soft)]"
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
            className="text-sm text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
          >
            キャンセル
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-[var(--secondary)] px-4 py-3 text-center text-xs text-[var(--foreground-muted)]">
          <p>匿名ログインでは、ブラウザを閉じるとデータが失われる場合があります。</p>
          <p>継続的に利用する場合はGoogleログインをお勧めします。</p>
        </div>
      </div>
    </div>
  );
};
