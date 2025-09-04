'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/lib/auth';

export const AppHeader: React.FC = () => {
  const { user, isAnonymous, loading: _loading, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (_e) {
      // noop
    }
  };

  return (
    <header className="border-b border-[var(--border)]">
      <div className="container flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/calendar-icon.svg"
            alt="Perfect Scheduler Logo"
            width={32}
            height={32}
            className="hidden sm:block"
          />
          <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-transparent bg-clip-text">
            Perfect Scheduler
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/about" className="text-[var(--foreground)] hover:text-[var(--primary)] transition">
            使い方
          </Link>
          <Link href="/create" className="btn btn-primary">
            新規作成
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="flex items-center space-x-2 text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] focus:outline-none"
              >
                {isAnonymous ? (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={user.photoURL || '/default-avatar.png'}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span>{getUserDisplayName(user)}</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <div className="font-medium">{getUserDisplayName(user)}</div>
                    <div className="text-xs text-gray-500">{isAnonymous ? '匿名ユーザー' : user.email}</div>
                  </div>
                  <Link
                    href="/me"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    マイページ
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-secondary">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
