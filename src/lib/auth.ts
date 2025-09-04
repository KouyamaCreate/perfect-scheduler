import { 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithRedirect,
  getRedirectResult,
  User
} from 'firebase/auth';
import { auth } from './firebase';

// Google認証プロバイダーの設定
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// 匿名ログイン
export const signInAsAnonymous = async (): Promise<User | null> => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('匿名ログインエラー:', error);
    throw error;
  }
};

// Googleログイン
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    // 通常のサインイン（匿名からのリンクやデータ移行は行わない）
    const result = await signInWithPopup(auth, googleProvider);
    // プロフィール初期同期（任意）
    const providerData = result.user.providerData?.[0];
    if (providerData) {
      await updateProfile(result.user, {
        displayName: result.user.displayName || providerData.displayName || undefined,
        photoURL: result.user.photoURL || providerData.photoURL || undefined,
      });
    }
    return result.user;
  } catch (error: any) {
    // ユーザーがポップアップを閉じた場合は静かに中断
    if (error?.code === 'auth/popup-closed-by-user') {
      return null;
    }
    // 既存アカウントなどの他エラー
    console.error('Googleログインエラー:', error);
    throw error;
  }
};

// ポップアップがブロックされる環境用のリダイレクト方式
export const signInWithGoogleRedirect = async (): Promise<void> => {
  const current = auth.currentUser;
  try {
    try { sessionStorage.setItem('ps_redirect_pending', '1'); } catch {}
    // 常に通常のリダイレクトサインイン（匿名からのリンクは行わない）
    await signInWithRedirect(auth, googleProvider); // ここでブラウザ遷移
  } catch (error) {
    console.error('Googleリダイレクト方式エラー:', error);
    throw error;
  }
};

// リダイレクト完了後に呼び出して、プロフィール同期と匿名データの移行を行う
export const completeGoogleRedirectIfPresent = async (): Promise<User | null> => {
  try {
    const res = await getRedirectResult(auth);
    if (!res || !res.user) return null;
    const user = res.user;
    // プロフィール初期同期（任意）
    const providerData = user.providerData?.[0];
    if (providerData) {
      try {
        await updateProfile(user, {
          displayName: user.displayName || providerData.displayName || undefined,
          photoURL: user.photoURL || providerData.photoURL || undefined,
        });
      } catch {}
    }
    try { sessionStorage.removeItem('ps_redirect_pending'); } catch {}
    return user;
  } catch (e) {
    try { sessionStorage.removeItem('ps_redirect_pending'); } catch {}
    // リダイレクト未実行時などはここに来ないか、nullになる
    return null;
  }
};

// ログアウト
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ユーザーが匿名かどうかを判定
export const isAnonymousUser = (user: User | null): boolean => {
  return user?.isAnonymous ?? false;
};

// ユーザーの表示名を取得（匿名の場合は「ゲスト」）
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'ゲスト';
  if (user.isAnonymous) return 'ゲスト';
  return user.displayName || user.email || 'ユーザー';
};
