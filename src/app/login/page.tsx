'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginModal } from '@/components/LoginModal';
import { useAuth } from '@/contexts/AuthContext';
import { ClientOnly } from '@/components/ClientOnly';

export default function LoginPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { user, loading } = useAuth();

  const handleClose = () => {
    setOpen(false);
    router.replace('/');
  };

  // 非匿名でログイン完了していれば自動的に閉じてホームへ
  useEffect(() => {
    if (!loading && user && !user.isAnonymous) {
      setOpen(false);
      router.replace('/');
    }
  }, [user, loading, router]);

  return (
    <>
      <ClientOnly>
        <LoginModal
          isOpen={open}
          onClose={handleClose}
          title="ログインまたはゲストで参加"
          description="Googleでログイン、またはゲストとして続行できます。"
        />
      </ClientOnly>
      {!open && (
        <main className="container py-8">
          <p>ログイン画面を閉じました。</p>
        </main>
      )}
    </>
  );
}
