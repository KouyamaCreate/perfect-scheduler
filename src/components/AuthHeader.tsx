'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/lib/auth';

export const AuthHeader: React.FC = () => {
  const { user, logout, isAnonymous } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="relative z-[80] border-b border-[var(--border)] bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Meetrace
            </h1>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 rounded-full border border-[var(--border)] bg-white px-2 py-1 text-sm font-medium text-[var(--foreground)] hover:border-[#aac8ff] hover:text-[var(--primary)] focus:outline-none"
            >
              <div className="flex items-center space-x-2">
                {isAnonymous ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)]">
                    <svg className="w-4 h-4 text-[var(--primary-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {isAnonymous && (
                  <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs text-[var(--primary-strong)]">
                    ゲスト
                  </span>
                )}
              </div>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="surface-card absolute right-0 mt-2 w-56 py-1 z-[100]">
                <div className="border-b border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]">
                  <div className="font-medium">
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-xs text-[var(--foreground-subtle)]">
                    {isAnonymous ? '匿名ユーザー' : user.email}
                  </div>
                </div>
                <Link
                  href="/me"
                  prefetch={false}
                  className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--primary-soft)]"
                  onClick={() => setShowDropdown(false)}
                >
                  マイページ
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--primary-soft)]"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
