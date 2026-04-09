'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { AppHeader } from '@/components/AppHeader';

type Schedule = {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
};
type ScheduleDoc = { name?: string; description?: string; createdAt?: { toDate?: () => Date } };

export default function MyPage() {
  const { user, loading } = useAuth();
  const [created, setCreated] = useState<Schedule[]>([]);
  const [participating, setParticipating] = useState<Schedule[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexRequired, setIndexRequired] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const uid = user.uid;
    const run = async () => {
      setBusy(true);
      setError(null);
      try {
        // 作成したスケジュール
        try {
          const createdQ = query(
            collection(db, 'schedules'),
            where('creatorId', '==', uid),
            orderBy('createdAt', 'desc')
          );
          const createdSnap = await getDocs(createdQ);
          type ScheduleDoc = { name?: string; description?: string; createdAt?: { toDate?: () => Date } };
          const createdList: Schedule[] = createdSnap.docs.map((d) => {
            const data = d.data() as ScheduleDoc;
            return {
              id: d.id,
              name: data.name ?? '',
              description: data.description,
              createdAt: data.createdAt?.toDate?.() ?? undefined,
            };
          });
          setCreated(createdList);
        } catch (_e) {
          // インデックス未作成などで失敗した場合は orderBy を外してリトライ
          const fallbackQ = query(
            collection(db, 'schedules'),
            where('creatorId', '==', uid)
          );
          const snap = await getDocs(fallbackQ);
          const list: Schedule[] = snap.docs.map((d) => {
            const data = d.data() as ScheduleDoc;
            return {
              id: d.id,
              name: data.name ?? '',
              description: data.description,
              createdAt: data.createdAt?.toDate?.() ?? undefined,
            };
          });
          setCreated(list);
        }

        // 参加中のスケジュール（collectionGroupで横断検索）
        try {
          const participantsQ = query(
            collectionGroup(db, 'participants'),
            where('userId', '==', uid)
          );
          const participantsSnap = await getDocs(participantsQ);
          // scheduleId を集めて重複排除
          const scheduleIds = new Set<string>();
          participantsSnap.docs.forEach((pd) => {
            const parentSchedule = pd.ref.parent.parent;
            if (parentSchedule) scheduleIds.add(parentSchedule.id);
          });
          // 該当スケジュールをまとめて取得
          const schedules: Schedule[] = [];
          await Promise.all(
            Array.from(scheduleIds).map(async (sid) => {
              const sref = doc(db, 'schedules', sid);
              const ssnap = await getDoc(sref);
              if (ssnap.exists()) {
                const data = ssnap.data() as ScheduleDoc;
                schedules.push({
                  id: sid,
                  name: data.name ?? '',
                  description: data.description,
                  createdAt: data.createdAt?.toDate?.() ?? undefined,
                });
              }
            })
          );
          // 新しい順に並べ替え
          schedules.sort((a, b) => {
            const at = a.createdAt?.getTime?.() ?? 0;
            const bt = b.createdAt?.getTime?.() ?? 0;
            return bt - at;
          });
          setParticipating(schedules);
          setIndexRequired(false);
        } catch (e: unknown) {
          // 単一フィールドインデックス未設定時のエラーに対処
          const msg = (typeof e === 'object' && e && 'message' in e) ? String((e as { message?: unknown }).message || '') : '';
          if (msg.includes('COLLECTION_GROUP_ASC') || msg.includes('requires a COLLECTION_GROUP')) {
            setIndexRequired(true);
          } else {
            throw e;
          }
        }
      } catch (_e: unknown) {
        console.error('Failed to load my page data:', _e);
        type WithMessage = { message?: unknown };
        const msg = (typeof _e === 'object' && _e && 'message' in _e)
          ? String(((_e as WithMessage).message) ?? '読み込みに失敗しました')
          : '読み込みに失敗しました';
        setError(msg);
      } finally {
        setBusy(false);
      }
    };
    run();
  }, [loading, user]);

  if (loading || busy) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="container py-8">
          <p>読み込み中...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="container py-8">
          <p>認証が必要です。</p>
          <p className="text-sm opacity-70 mt-2">匿名ユーザーでも利用可能ですが、ブラウザのストレージを消去するとデータは紐付かなくなります。</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="container py-8 space-y-10">
      <section>
        <h1 className="text-2xl font-bold mb-4">マイページ</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">作成したスケジュール ({created.length})</h2>
        {created.length === 0 ? (
          <p className="opacity-70">まだ作成したスケジュールはありません</p>
        ) : (
          <ul className="space-y-2">
            {created.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-3 rounded border border-[var(--border)] bg-[var(--secondary)]">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.description && (
                    <p className="text-sm opacity-70">{s.description}</p>
                  )}
                </div>
                <Link href={`/schedule/${s.id}`} className="btn btn-secondary">開く</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">参加中のスケジュール ({participating.length})</h2>
        {indexRequired && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
            参加中のスケジュールを表示するには、Firestore の単一フィールドインデックスが必要です。<br />
            Firebase Console で <code>participants</code> コレクショングループの <code>userId</code> をインデックス対象にしてください。
            <div className="mt-2">
              <a
                href="https://console.firebase.google.com/v1/r/project/perfect-scheduler-410a0/firestore/indexes?create_exemption=CmBwcm9qZWN0cy9wZXJmZWN0LXNjaGVkdWxlci00MTBhMC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcGFydGljaXBhbnRzL2ZpZWxkcy91c2VySWQQAhoKCgZ1c2VySWQQAQ"
                target="_blank"
                rel="noreferrer"
                className="underline text-[var(--primary)]"
              >
                コンソールで作成（推奨のショートカット）
              </a>
            </div>
          </div>
        )}
        {participating.length === 0 && !indexRequired ? (
          <p className="opacity-70">まだ参加中のスケジュールはありません</p>
        ) : (!indexRequired && (
          <ul className="space-y-2">
            {participating.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-3 rounded border border-[var(--border)] bg-[var(--secondary)]">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.description && (
                    <p className="text-sm opacity-70">{s.description}</p>
                  )}
                </div>
                <Link href={`/schedule/${s.id}`} className="btn btn-secondary">開く</Link>
              </li>
            ))}
          </ul>
        ))}
      </section>
      </main>
    </div>
  );
}
