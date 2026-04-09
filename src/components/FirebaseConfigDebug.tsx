'use client';

import React, { useState, useEffect } from 'react';

export const FirebaseConfigDebug: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('読み込み中...');

  useEffect(() => {
    setIsClient(true);
    setCurrentDomain(window.location.hostname);
  }, []);

  // 開発環境でのみ表示、かつクライアントサイドでのみレンダリング
  if (process.env.NODE_ENV !== 'development' || !isClient) {
    return null;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  const configStatus = Object.entries(firebaseConfig).map(([key, value]) => ({
    key,
    hasValue: !!value
  }));

  return (
    <div className="fixed bottom-4 left-4 bg-blue-900 bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">🔧 Firebase Config</div>
      <div className="space-y-1">
        {configStatus.map(({ key, hasValue }) => (
          <div key={key} className="flex justify-between">
            <span className="truncate mr-2">{key}:</span>
            <span className={hasValue ? 'text-green-300' : 'text-red-300'}>
              {hasValue ? '✅' : '❌'}
            </span>
          </div>
        ))}
        
        <div className="mt-2 pt-2 border-t border-blue-700">
          <div className="text-xs opacity-75">
            現在のドメイン: {currentDomain}
          </div>
        </div>
      </div>
    </div>
  );
};