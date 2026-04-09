'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { InlineCalendar } from '@/components/InlineCalendar';

export default function CreateSchedule() {
    const router = useRouter();
    const { user, loading: authLoading, signInAnonymously } = useAuth();
    const [eventName, setEventName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [timeSlotDuration, setTimeSlotDuration] = useState('30');
    const [excludeWeekends, setExcludeWeekends] = useState(false);
    const [excludeWeekdays, setExcludeWeekdays] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (authLoading || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Firestore ルールが request.auth を要求するため、保存前に認証状態を確実に揃える
            const currentUser = user ?? (await signInAnonymously()) ?? auth.currentUser;
            if (!currentUser) {
                throw new Error('認証ユーザーを取得できませんでした。');
            }
            await currentUser.getIdToken();

            // ユニークIDを生成
            const scheduleId = uuidv4();

            // Firestoreにデータを保存
            await setDoc(doc(db, 'schedules', scheduleId), {
                name: eventName,
                description,
                startDate,
                endDate,
                startTime,
                endTime,
                duration: parseInt(timeSlotDuration, 10),
                excludeWeekends,
                excludeWeekdays,
                createdAt: new Date(),
                creatorId: currentUser.uid
            });

            // スケジュールページに移動
            router.push(`/schedule/${scheduleId}`);
        } catch (error) {
            console.error('Error creating schedule:', error);
            alert('スケジュールの作成中にエラーが発生しました。もう一度お試しください。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <AppHeader />

            <main className="flex-1 container py-10">
                <div className="surface-card mb-6 p-6 md:p-8">
                    <p className="eyebrow mb-3">Create schedule</p>
                    <h1 className="mb-3 text-[2rem] font-bold text-[var(--foreground)]">調整ページを作成</h1>
                    <p className="max-w-3xl text-base leading-7 text-[var(--foreground-muted)]">
                        Meetrace では、候補日を設定すると参加者がドラッグ操作で回答できるタイムラインが作成されます。
                        まずはイベント名と候補時間を入力してください。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
                    <div className="surface-card p-6 md:p-8">
                        <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">基本情報</h2>

                        <div className="mb-4">
                            <label htmlFor="eventName" className="block font-medium mb-2">
                                イベント名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="eventName"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="input"
                                placeholder="ミーティング、イベントなど"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="description" className="block font-medium mb-2">
                                説明
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input h-24"
                                placeholder="イベントの詳細情報を入力してください（任意）"
                            />
                        </div>
                    </div>

                    <div className="surface-card p-6 md:p-8">
                        <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">日程と時間</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label htmlFor="startDate" className="block font-medium mb-2">
                                    開始日 <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 gap-3 items-start">
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="input"
                                        required
                                    />
                                    <InlineCalendar
                                        value={startDate}
                                        onChange={setStartDate}
                                        ariaLabel="開始日カレンダー"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="endDate" className="block font-medium mb-2">
                                    終了日 <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 gap-3 items-start">
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="input"
                                        required
                                    />
                                    <InlineCalendar
                                        value={endDate}
                                        onChange={setEndDate}
                                        ariaLabel="終了日カレンダー"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="startTime" className="block font-medium mb-2">
                                    開始時間 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    id="startTime"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="endTime" className="block font-medium mb-2">
                                    終了時間 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    id="endTime"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="timeSlotDuration" className="block font-medium mb-2">
                                時間枠の長さ <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="timeSlotDuration"
                                value={timeSlotDuration}
                                onChange={(e) => setTimeSlotDuration(e.target.value)}
                                className="input"
                                required
                            >
                                <option value="15">15分</option>
                                <option value="30">30分</option>
                                <option value="60">1時間</option>
                            </select>
                        </div>

                        <div className="mt-6">
                            <h3 className="font-medium mb-2">期間の条件</h3>
                            <div className="flex flex-col gap-2">
                                <label className={`inline-flex items-center gap-2 ${excludeWeekdays ? 'opacity-50' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={excludeWeekends}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setExcludeWeekends(checked);
                                            if (checked) setExcludeWeekdays(false);
                                        }}
                                        disabled={excludeWeekdays}
                                    />
                                    <span>1: 土日を除く（平日のみ）</span>
                                </label>
                                <label className={`inline-flex items-center gap-2 ${excludeWeekends ? 'opacity-50' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={excludeWeekdays}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setExcludeWeekdays(checked);
                                            if (checked) setExcludeWeekends(false);
                                        }}
                                        disabled={excludeWeekends}
                                    />
                                    <span>2: 平日を除く（土日のみ）</span>
                                </label>
                            </div>
                            <p className="text-xs opacity-70 mt-1">どちらか一方のみ選択できます。</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/" className="btn btn-secondary">
                            キャンセル
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={authLoading || isSubmitting}>
                            {isSubmitting ? '作成中...' : 'スケジュールを作成'}
                        </button>
                    </div>
                </form>
            </main>

            <footer className="border-t border-[var(--border)] py-6">
                <div className="container text-center">
                    <p className="text-sm text-[var(--foreground-muted)]">
                        © 2025 Meetrace. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
