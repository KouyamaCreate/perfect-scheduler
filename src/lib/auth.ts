import { 
  signInAnonymously, 
  signInWithPopup, 
  linkWithPopup,
  linkWithRedirect,
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithRedirect,
  getRedirectResult,
  User
} from 'firebase/auth';
import { db } from './firebase';
import { collectionGroup, getDocs, where, query, doc, setDoc, collection, getDoc } from 'firebase/firestore';
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
    const current = auth.currentUser;
    const oldAnonUid = current?.isAnonymous ? current.uid : null;
    // 匿名ユーザーをGoogleアカウントにリンクしてUIDを維持（参加情報を引き継ぐ）
    if (current && current.isAnonymous) {
      const linkResult = await linkWithPopup(current, googleProvider);
      try { localStorage.setItem('ps_mergedAnonUid', current.uid); } catch {}
      // プロフィール初期同期（displayName / photoURL）
      const providerData = linkResult.user.providerData?.[0];
      if (providerData) {
        await updateProfile(linkResult.user, {
          displayName: linkResult.user.displayName || providerData.displayName || undefined,
          photoURL: linkResult.user.photoURL || providerData.photoURL || undefined,
        });
      }
      return linkResult.user;
    }
    // それ以外は通常のサインイン
    const result = await signInWithPopup(auth, googleProvider);
    // もし直前まで匿名だったUIDを保持していれば、参加情報を新UIDにマイグレーション
    if (oldAnonUid && result.user.uid !== oldAnonUid) {
      await migrateAnonParticipants(oldAnonUid, result.user.uid);
      try { localStorage.setItem('ps_mergedAnonUid', oldAnonUid); } catch {}
    }
    return result.user;
  } catch (error: any) {
    // ユーザーがポップアップを閉じた場合は静かに中断
    if (error?.code === 'auth/popup-closed-by-user') {
      return null;
    }
    // 既存のGoogleアカウントに紐付いているなどの場合
    if (error?.code === 'auth/credential-already-in-use') {
      const current = auth.currentUser;
      const oldAnonUid = current?.isAnonymous ? current.uid : null;
      // すでにGoogleで作成済みのユーザとしてサインイン
      const result = await signInWithPopup(auth, googleProvider);
      // 旧匿名UIDがあれば参加情報を新UIDへコピー（重複は上書きマージ）
      if (oldAnonUid && result.user.uid !== oldAnonUid) {
        await migrateAnonParticipants(oldAnonUid, result.user.uid);
        try { localStorage.setItem('ps_mergedAnonUid', oldAnonUid); } catch {}
      }
      // プロフィール初期同期
      const providerData = result.user.providerData?.[0];
      if (providerData) {
        await updateProfile(result.user, {
          displayName: result.user.displayName || providerData.displayName || undefined,
          photoURL: result.user.photoURL || providerData.photoURL || undefined,
        });
      }
      return result.user;
    }
    console.error('Googleログインエラー:', error);
    throw error;
  }
};

// ポップアップがブロックされる環境用のリダイレクト方式
export const signInWithGoogleRedirect = async (): Promise<void> => {
  const current = auth.currentUser;
  try {
    try { sessionStorage.setItem('ps_redirect_pending', '1'); } catch {}
    if (current && current.isAnonymous) {
      try { localStorage.setItem('ps_lastAnonUid', current.uid); } catch {}
      await linkWithRedirect(current, googleProvider);
      return; // ここでブラウザ遷移
    }
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
    // プロフィール初期同期
    const providerData = user.providerData?.[0];
    if (providerData) {
      await updateProfile(user, {
        displayName: user.displayName || providerData.displayName || undefined,
        photoURL: user.photoURL || providerData.photoURL || undefined,
      });
    }
    // 旧匿名UIDからのマイグレーション
    let oldAnonUid: string | null = null;
    try { oldAnonUid = localStorage.getItem('ps_lastAnonUid'); } catch {}
    if (oldAnonUid && oldAnonUid !== user.uid) {
      await migrateAnonParticipants(oldAnonUid, user.uid);
    }
    try { localStorage.setItem('ps_mergedAnonUid', oldAnonUid || ''); } catch {}
    try { localStorage.removeItem('ps_lastAnonUid'); } catch {}
    try { sessionStorage.removeItem('ps_redirect_pending'); } catch {}
    return user;
  } catch (e) {
    try { sessionStorage.removeItem('ps_redirect_pending'); } catch {}
    // リダイレクト未実行時などはここに来ないか、nullになる
    return null;
  }
};

// 旧匿名UIDの参加情報を新UIDにコピー（イベントごと）
async function migrateAnonParticipants(oldUid: string, newUid: string): Promise<void> {
  // 旧UIDの参加ドキュメントを横断検索
  const q = query(collectionGroup(db, 'participants'), where('userId', '==', oldUid));
  const snap = await getDocs(q);
  const tasks: Promise<any>[] = [];
  snap.docs.forEach((d) => {
    const parentSchedule = d.ref.parent.parent; // schedules/{id}
    if (!parentSchedule) return;
    const data = d.data() as any;
    const newRef = doc(db, 'schedules', parentSchedule.id, 'participants', newUid);
    tasks.push((async () => {
      // 既存の新UIDドキュメントを取得し、スロット等をマージ
      const existingNew = await getDoc(newRef);
      const existingData = existingNew.exists() ? (existingNew.data() as any) : null;

      const oldSlots: string[] = Array.isArray(data?.slots) ? data.slots : [];
      const newSlots: string[] = Array.isArray(existingData?.slots) ? existingData.slots : [];
      const mergedSlots = Array.from(new Set([...(newSlots || []), ...(oldSlots || [])]));

      const preservedName = existingData?.name || data?.name || '';
      const toJsDate = (v: any): Date | null => {
        if (!v) return null;
        try {
          if (typeof v.toDate === 'function') return v.toDate();
        } catch {}
        if (v instanceof Date) return v;
        return null;
      };
      const createdAtOld = toJsDate(data?.createdAt);
      const createdAtNew = toJsDate(existingData?.createdAt);
      const createdAt = (createdAtOld && createdAtNew)
        ? (createdAtOld < createdAtNew ? createdAtOld : createdAtNew)
        : (createdAtOld || createdAtNew || new Date());

      await setDoc(
        newRef,
        {
          userId: newUid,
          name: preservedName,
          slots: mergedSlots,
          createdAt,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    })());
  });
  await Promise.all(tasks);

  // 旧UIDが作成者のスケジュールのcreatorIdを新UIDに更新
  const sq = query(collection(db, 'schedules'), where('creatorId', '==', oldUid));
  const ssnap = await getDocs(sq);
  const scheduleTasks: Promise<any>[] = [];
  ssnap.docs.forEach((sd) => {
    const sref = doc(db, 'schedules', sd.id);
    scheduleTasks.push(
      setDoc(
        sref,
        {
          creatorId: newUid,
          updatedAt: new Date(),
        },
        { merge: true }
      )
    );
  });
  await Promise.all(scheduleTasks);
}

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
