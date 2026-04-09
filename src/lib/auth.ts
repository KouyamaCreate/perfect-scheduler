import {
  GoogleAuthProvider,
  User,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';

type FirebaseLikeError = {
  code?: string;
  message?: string;
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

async function syncGoogleProfile(user: User): Promise<void> {
  const providerData = user.providerData?.[0];
  if (!providerData) return;

  try {
    await updateProfile(user, {
      displayName: user.displayName || providerData.displayName || undefined,
      photoURL: user.photoURL || providerData.photoURL || undefined,
    });
  } catch {
    // noop
  }
}

async function migrateAnonParticipants(oldUid: string, newUid: string): Promise<void> {
  const participantsQuery = query(collectionGroup(db, 'participants'), where('userId', '==', oldUid));
  const participantsSnapshot = await getDocs(participantsQuery);

  const participantTasks = participantsSnapshot.docs.map(async (participantDoc) => {
    const parentSchedule = participantDoc.ref.parent.parent;
    if (!parentSchedule) return;

    const data = participantDoc.data() as {
      createdAt?: { toDate?: () => Date } | Date;
      name?: string;
      slots?: string[];
    };
    const targetRef = doc(db, 'schedules', parentSchedule.id, 'participants', newUid);
    const existingTarget = await getDoc(targetRef);
    const existingData = existingTarget.exists()
      ? (existingTarget.data() as { createdAt?: { toDate?: () => Date } | Date; name?: string; slots?: string[] })
      : null;

    const existingSlots = Array.isArray(existingData?.slots) ? existingData.slots : [];
    const oldSlots = Array.isArray(data?.slots) ? data.slots : [];
    const mergedSlots = Array.from(new Set([...existingSlots, ...oldSlots]));

    const toDate = (value?: { toDate?: () => Date } | Date): Date | null => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value.toDate === 'function') return value.toDate();
      return null;
    };

    const createdAtOld = toDate(data.createdAt);
    const createdAtNew = toDate(existingData?.createdAt);
    const createdAt =
      createdAtOld && createdAtNew
        ? createdAtOld < createdAtNew ? createdAtOld : createdAtNew
        : createdAtOld || createdAtNew || new Date();

    await setDoc(
      targetRef,
      {
        userId: newUid,
        name: existingData?.name || data?.name || '',
        slots: mergedSlots,
        createdAt,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  });

  await Promise.all(participantTasks);

  const schedulesQuery = query(collection(db, 'schedules'), where('creatorId', '==', oldUid));
  const schedulesSnapshot = await getDocs(schedulesQuery);
  await Promise.all(
    schedulesSnapshot.docs.map((scheduleDoc) =>
      setDoc(
        doc(db, 'schedules', scheduleDoc.id),
        {
          creatorId: newUid,
          updatedAt: new Date(),
        },
        { merge: true }
      )
    )
  );
}

export const signInAsAnonymous = async (): Promise<User | null> => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('匿名ログインエラー:', error);
    throw error;
  }
};

export const signInWithGoogle = async (): Promise<User | null> => {
  const currentUser = auth.currentUser;
  const oldAnonUid = currentUser?.isAnonymous ? currentUser.uid : null;

  try {
    if (currentUser && currentUser.isAnonymous) {
      const linkResult = await linkWithPopup(currentUser, googleProvider);
      await syncGoogleProfile(linkResult.user);
      try {
        localStorage.setItem('ps_mergedAnonUid', currentUser.uid);
      } catch {}
      return linkResult.user;
    }

    const result = await signInWithPopup(auth, googleProvider);
    if (oldAnonUid && result.user.uid !== oldAnonUid) {
      await migrateAnonParticipants(oldAnonUid, result.user.uid);
      try {
        localStorage.setItem('ps_mergedAnonUid', oldAnonUid);
      } catch {}
    }
    await syncGoogleProfile(result.user);
    return result.user;
  } catch (error: unknown) {
    const { code } = (typeof error === 'object' && error ? error as FirebaseLikeError : {});

    if (code === 'auth/popup-closed-by-user') {
      return null;
    }

    if (code === 'auth/credential-already-in-use') {
      const result = await signInWithPopup(auth, googleProvider);
      if (oldAnonUid && result.user.uid !== oldAnonUid) {
        await migrateAnonParticipants(oldAnonUid, result.user.uid);
        try {
          localStorage.setItem('ps_mergedAnonUid', oldAnonUid);
        } catch {}
      }
      await syncGoogleProfile(result.user);
      return result.user;
    }

    console.error('Googleログインエラー:', error);
    throw error;
  }
};

export const signInWithGoogleRedirect = async (): Promise<void> => {
  const currentUser = auth.currentUser;

  try {
    try {
      sessionStorage.setItem('ps_redirect_pending', '1');
    } catch {}

    if (currentUser && currentUser.isAnonymous) {
      try {
        localStorage.setItem('ps_lastAnonUid', currentUser.uid);
      } catch {}
      await linkWithRedirect(currentUser, googleProvider);
      return;
    }

    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error('Googleリダイレクト方式エラー:', error);
    throw error;
  }
};

export const completeGoogleRedirectIfPresent = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;

    await syncGoogleProfile(result.user);

    let oldAnonUid: string | null = null;
    try {
      oldAnonUid = localStorage.getItem('ps_lastAnonUid');
    } catch {}

    if (oldAnonUid && oldAnonUid !== result.user.uid) {
      await migrateAnonParticipants(oldAnonUid, result.user.uid);
    }

    try {
      localStorage.setItem('ps_mergedAnonUid', oldAnonUid || '');
      localStorage.removeItem('ps_lastAnonUid');
      sessionStorage.removeItem('ps_redirect_pending');
    } catch {}

    return result.user;
  } catch {
    try {
      sessionStorage.removeItem('ps_redirect_pending');
    } catch {}
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const isAnonymousUser = (user: User | null): boolean => {
  return user?.isAnonymous ?? false;
};

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'ゲスト';
  if (user.isAnonymous) return 'ゲスト';
  return user.displayName || user.email || 'ユーザー';
};
