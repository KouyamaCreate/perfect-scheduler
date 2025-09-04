import { 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
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
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Googleログインエラー:', error);
    throw error;
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