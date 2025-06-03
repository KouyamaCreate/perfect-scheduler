'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CreateSchedule() {
    const router = useRouter();
    const [eventName, setEventName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [timeSlotDuration, setTimeSlotDuration] = useState('30');

    // State for date order validation
    const [isDateOrderValid, setIsDateOrderValid] = useState(true);
    const [dateOrderWarning, setDateOrderWarning] = useState("");

    React.useEffect(() => {
        if (startDate && endDate) {
            const d1 = new Date(startDate);
            const d2 = new Date(endDate);
            if (d2 < d1) {
                setIsDateOrderValid(false);
                setDateOrderWarning("終了日は開始日より後の日付を選択してください。");
            } else {
                setIsDateOrderValid(true);
                setDateOrderWarning("");
            }
        } else {
            // If one or both dates are empty, clear previous warning and consider valid for now
            setIsDateOrderValid(true);
            setDateOrderWarning("");
        }
    }, [startDate, endDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
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
                duration: parseInt(timeSlotDuration),
                createdAt: new Date()
            });

            // スケジュールページに移動
            router.push(`/schedule/${scheduleId}`);
        } catch (error) {
            console.error('Error creating schedule:', error);
            alert('スケジュールの作成中にエラーが発生しました。もう一度お試しください。');
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* ヘッダー */}
            <header className="border-b border-[var(--border)]">
                <div className="container flex justify-between items-center py-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/calendar-icon.svg"
                            alt="Perfect Scheduler Logo"
                            width={32}
                            height={32}
                            className="hidden sm:block"
                        />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-transparent bg-clip-text">
                            Perfect Scheduler
                        </h1>
                    </Link>
                </div>
            </header>

            <main className="flex-1 container py-8">
                <h1 className="text-3xl font-bold mb-8">スケジュールの作成</h1>

                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    <div className="bg-[var(--secondary)] p-6 rounded-lg mb-8">
                        <h2 className="text-xl font-semibold mb-4">基本情報</h2>

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

                    <div className="bg-[var(--secondary)] p-6 rounded-lg mb-8">
                        <h2 className="text-xl font-semibold mb-4">日程と時間</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="startDate" className="block font-medium mb-2">
                                    開始日 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="endDate" className="block font-medium mb-2">
                                    終了日 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>
                        {dateOrderWarning && <p className="text-red-500 text-sm mt-1 mb-4">{dateOrderWarning}</p>}

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
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/" className="btn btn-secondary">
                            キャンセル
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={!isDateOrderValid}>
                            スケジュールを作成
                        </button>
                    </div>
                </form>
            </main>

            {/* フッター */}
            <footer className="border-t border-[var(--border)] py-6">
                <div className="container text-center">
                    <p className="text-sm text-[var(--foreground)] opacity-70">
                        © 2025 Perfect Scheduler. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}