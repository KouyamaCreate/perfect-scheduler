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
    <header className="relative z-[80] border-b border-[var(--border)] bg-white/90 backdrop-blur-sm">
      <div className="container flex min-h-[76px] justify-between items-center gap-6 py-3">
        <Link href="/" prefetch={false} className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#aac8ff] bg-[linear-gradient(180deg,#ebf3ff_0%,#dce8ff_100%)] shadow-[0_8px_20px_rgba(40,100,240,0.12)]">
            <Image
              src="/calendar-icon.svg"
              alt="Meetrace Logo"
              width={22}
              height={22}
            />
          </span>
          <div>
            <p className="eyebrow">drag to match</p>
            <h1 className="text-[1.25rem] font-bold text-[var(--foreground)]">Meetrace</h1>
          </div>
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/about" prefetch={false} className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition">
            使い方
          </Link>
          <Link href="/create" prefetch={false} className="btn btn-primary">
            新規作成
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="flex items-center space-x-2 rounded-full border border-[var(--border)] bg-white px-2 py-1 text-sm font-medium text-[var(--foreground)] hover:border-[#aac8ff] hover:text-[var(--primary)] focus:outline-none"
              >
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
              </button>

              {showDropdown && (
                <div className="surface-card absolute right-0 mt-2 w-60 py-1 z-[100]">
                  <div className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]">
                    <div className="font-medium">{getUserDisplayName(user)}</div>
                    <div className="text-xs text-[var(--foreground-subtle)]">{isAnonymous ? '匿名ユーザー' : user.email}</div>
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
          ) : (
            <Link href="/login" prefetch={false} className="btn btn-secondary">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
