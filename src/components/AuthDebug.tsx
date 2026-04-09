'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const AuthDebug: React.FC = () => {
  const { user, loading, isAnonymous } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 開発環境でのみ表示、かつクライアントサイドでのみレンダリング
  if (process.env.NODE_ENV !== 'development' || !isClient) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <div className="font-bold mb-2">🔍 Auth Debug</div>
      <div className="space-y-1">
        <div>Loading: {loading ? '✅' : '❌'}</div>
        <div>User: {user ? '✅' : '❌'}</div>
        <div>Anonymous: {isAnonymous ? '✅' : '❌'}</div>
        {user && (
          <>
            <div>UID: {user.uid.substring(0, 8)}...</div>
            <div>Email: {user.email || 'なし'}</div>
            <div>Name: {user.displayName || 'なし'}</div>
          </>
        )}
      </div>
    </div>
  );
};