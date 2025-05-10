'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

export default function ScheduleDemo() {
    const searchParams = useSearchParams();

    // URLからパラメータを取得
    const eventName = searchParams.get('name') || 'サンプルイベント';
    const description = searchParams.get('description') || '';
    const startDate = searchParams.get('startDate') || '2025-05-15';
    const endDate = searchParams.get('endDate') || '2025-05-17';
    const startTime = searchParams.get('startTime') || '09:00';
    const endTime = searchParams.get('endTime') || '17:00';
    const duration = parseInt(searchParams.get('duration') || '30');

    // 状態管理
    const [username, setUsername] = useState('');
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [participants, setParticipants] = useState<{ name: string, slots: string[] }[]>([]);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);

    // 日付の配列を生成（開始日から終了日まで）
    const dates = getDatesInRange(startDate, endDate);

    // 時間スロットの配列を生成
    const timeSlots = getTimeSlots(startTime, endTime, duration);

    // 参加者を追加する機能
    const handleAddParticipant = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || selectedSlots.length === 0) return;

        setParticipants([...participants, {
            name: username,
            slots: [...selectedSlots]
        }]);

        setUsername('');
        setSelectedSlots([]);
    };

    // 時間スロットの選択状態を切り替える
    const toggleTimeSlot = (dateIndex: number, timeIndex: number) => {
        const slotId = `${dateIndex}-${timeIndex}`;
        if (selectedSlots.includes(slotId)) {
            setSelectedSlots(selectedSlots.filter(id => id !== slotId));
        } else {
            setSelectedSlots([...selectedSlots, slotId]);
        }
    };

    // シェアリンクをコピーする
    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // コンポーネントがマウントされた時にシェアリンクを設定
    useEffect(() => {
        setShareLink(window.location.href);
    }, []);

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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">{eventName}</h1>
                    {description && <p className="opacity-80">{description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* スケジュール表示部分 */}
                    <div className="md:col-span-2 overflow-x-auto">
                        <h2 className="text-xl font-semibold mb-4">スケジュールを選択</h2>
                        <div className="calendar-grid mb-4" style={{
                            gridTemplateColumns: `auto ${dates.map(() => '1fr').join(' ')}`
                        }}>
                            {/* 日付ヘッダー */}
                            <div className="p-2 font-bold border-b border-r border-[var(--border)]"></div>
                            {dates.map((date, index) => (
                                <div key={index} className="p-2 text-center font-bold border-b border-r border-[var(--border)]">
                                    {formatDate(date)}
                                </div>
                            ))}

                            {/* 時間スロット */}
                            {timeSlots.map((time, timeIndex) => (
                                <React.Fragment key={timeIndex}>
                                    <div className="p-2 border-b border-r border-[var(--border)] whitespace-nowrap">
                                        {time}
                                    </div>
                                    {dates.map((_, dateIndex) => {
                                        const slotId = `${dateIndex}-${timeIndex}`;
                                        const isSelected = selectedSlots.includes(slotId);
                                        const availability = getAvailability(participants, slotId);

                                        return (
                                            <div
                                                key={dateIndex}
                                                className={`time-slot border-b border-r border-[var(--border)] ${isSelected ? 'selected' : ''} ${availability > 0 ? (availability === participants.length ? 'available' : 'partially') : ''}`}
                                                onClick={() => toggleTimeSlot(dateIndex, timeIndex)}
                                            >
                                                {availability > 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                                        {availability}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[var(--primary)]"></div>
                                <span className="text-sm">あなたの選択</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#22c55e]"></div>
                                <span className="text-sm">全員参加可</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#eab308]"></div>
                                <span className="text-sm">一部参加可</span>
                            </div>
                        </div>
                    </div>

                    {/* 参加者登録部分 */}
                    <div>
                        <div className="bg-[var(--secondary)] p-4 rounded-lg mb-6">
                            <h2 className="text-xl font-semibold mb-4">参加情報を入力</h2>
                            <form onSubmit={handleAddParticipant}>
                                <div className="mb-4">
                                    <label htmlFor="username" className="block font-medium mb-2">
                                        お名前 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="input"
                                        placeholder="名前を入力"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <p className="block font-medium mb-2">
                                        選択済み時間枠: {selectedSlots.length}
                                    </p>
                                    <p className="text-sm opacity-70">
                                        上の表で参加可能な時間帯を選択してください
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-full"
                                    disabled={!username || selectedSlots.length === 0}
                                >
                                    参加情報を登録
                                </button>
                            </form>
                        </div>

                        <div className="bg-[var(--secondary)] p-4 rounded-lg mb-6">
                            <h2 className="text-xl font-semibold mb-4">スケジュールを共有</h2>
                            <div className="flex flex-col mb-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={shareLink}
                                        readOnly
                                        className="input pr-12"
                                    />
                                    <button
                                        onClick={copyShareLink}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--primary)] px-3"
                                    >
                                        {copied ? '✓' : 'コピー'}
                                    </button>
                                </div>
                                <p className="text-sm mt-2 opacity-70">
                                    このリンクを共有して、参加者を招待しましょう
                                </p>
                            </div>
                        </div>

                        <div className="bg-[var(--secondary)] p-4 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4">参加者一覧 ({participants.length})</h2>
                            {participants.length > 0 ? (
                                <ul className="space-y-2">
                                    {participants.map((participant, index) => (
                                        <li key={index} className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium">{participant.name}</span>
                                                <span className="text-sm opacity-70 ml-2">
                                                    {participant.slots.length}枠選択
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="opacity-70">まだ参加者はいません</p>
                            )}
                        </div>
                    </div>
                </div>
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

// ヘルパー関数
function getDatesInRange(startDate: string, endDate: string): Date[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: Date[] = [];

    let current = start;
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

function getTimeSlots(startTime: string, endTime: string, duration: number): string[] {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    const slots: string[] = [];
    for (let minutes = start; minutes < end; minutes += duration) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    return slots;
}

function formatDate(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];

    return `${month}/${day} (${weekday})`;
}

function getAvailability(participants: { name: string, slots: string[] }[], slotId: string): number {
    return participants.filter(p => p.slots.includes(slotId)).length;
}