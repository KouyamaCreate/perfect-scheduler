'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/LoginModal';
import { getUserDisplayName } from '@/lib/auth';

// URLパラメータを取得するコンポーネント
function ScheduleDemoContent() {
    const searchParams = useSearchParams();
    const { user, loading: authLoading, signInAnonymously } = useAuth();

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
    const [participants, setParticipants] = useState<{ id: string; name: string; slots: string[] }[]>([]);
    const [slotsInitialized, setSlotsInitialized] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // カラーカスタマイズ用の状態
    const [minColor, setMinColor] = useState('#eab308'); // 少ない時の色（黄色）
    const [maxColor, setMaxColor] = useState('#22c55e'); // 多い時の色（緑色）

    // 選択モード（デフォルトはWhen2Meetと同じく範囲選択）
    const [selectionType, setSelectionType] = useState<'path' | 'area'>('area');
    
    // 長押し関連のstate
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const [longPressStarted, setLongPressStarted] = useState(false);

    // 選択操作のための状態変数
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStartPoint, setSelectionStartPoint] = useState<{ dateIndex: number, timeIndex: number } | null>(null);
    const [selectionCurrentPoint, setSelectionCurrentPoint] = useState<{ dateIndex: number, timeIndex: number } | null>(null);
    const [isAdding, setIsAdding] = useState(true);
    const [dragStarted, setDragStarted] = useState(false);

    // 日付と時間スロットの配列を生成
    const dates = getDatesInRange(startDate, endDate);
    const timeSlots = getTimeSlots(startTime, endTime, duration);

    // 認証状態の管理とユーザー名の自動設定
    useEffect(() => {
        if (!authLoading && !user) {
            // 未認証の場合は自動的に匿名ログインを実行
            signInAnonymously().catch(console.error);
        }
    }, [authLoading, user, signInAnonymously]);

    // ユーザー名の自動設定（同一ユーザーは保存済み氏名で固定）とスロット引き継ぎ
    useEffect(() => {
        if (!user) return;
        const me = participants.find(p => p.id === user.uid);
        if (me) {
            if (me.name && username !== me.name) {
                setUsername(me.name);
            }
            if (!slotsInitialized && selectedSlots.length === 0 && me.slots && me.slots.length > 0) {
                setSelectedSlots(me.slots);
                setSlotsInitialized(true);
            }
            return;
        }
        if (!username) {
            setUsername(getUserDisplayName(user));
        }
    }, [user, username, participants, slotsInitialized, selectedSlots.length]);

    // 参加者を追加する
    const handleAddParticipant = (e: React.FormEvent) => {
        e.preventDefault();
        
        // 認証チェック
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        if (!username || selectedSlots.length === 0) return;

        // 同一ユーザー（UID）で一意化。既存があれば氏名は保持し、スロットを更新
        setParticipants(prev => {
            const idx = prev.findIndex(p => p.id === user.uid);
            if (idx >= 0) {
                const fixedName = prev[idx].name;
                const updated = [...prev];
                updated[idx] = { id: user.uid, name: fixedName, slots: [...selectedSlots] };
                return updated;
            }
            return [...prev, { id: user.uid, name: username, slots: [...selectedSlots] }];
        });

        // デモではクリアせず、直前の回答を保持
    };

    // セルをクリックした時の処理（選択開始）
    const handleCellMouseDown = (dateIndex: number, timeIndex: number, e: React.MouseEvent) => {
        e.preventDefault();

        const slotId = `${dateIndex}-${timeIndex}`;
        const isSelected = selectedSlots.includes(slotId);

        // 追加モード or 削除モードを決定
        setIsAdding(!isSelected);

        // 選択操作の開始ポイントを記録
        setSelectionStartPoint({ dateIndex, timeIndex });
        setSelectionCurrentPoint({ dateIndex, timeIndex });

        // 選択中状態に設定
        setIsSelecting(true);
        setDragStarted(false);

        // 単一セル選択の場合はここですぐに選択状態を変更
        if (selectionType === 'path') {
            toggleCellSelection(dateIndex, timeIndex);
        }

        // マウスアップイベントをwindowに設定
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleGlobalMouseMove);
    };

    // マウス移動時の処理（セル上）
    const handleCellMouseEnter = (dateIndex: number, timeIndex: number) => {
        if (!isSelecting) return;

        // ドラッグ開始フラグを立てる
        setDragStarted(true);

        // 現在位置を更新
        setSelectionCurrentPoint({ dateIndex, timeIndex });
    };

    // タッチイベント用state
    const [touchActiveCell, setTouchActiveCell] = useState<{ dateIndex: number, timeIndex: number } | null>(null);

    // タッチ開始時
    const handleCellTouchStart = (dateIndex: number, timeIndex: number, e: React.TouchEvent) => {
        // シングルタッチのみ処理
        if (e.touches.length !== 1) return;
        
        // PCでは従来通りの処理
        if (window.innerWidth > 768) {
            e.preventDefault();
            const slotId = `${dateIndex}-${timeIndex}`;
            const isSelected = selectedSlots.includes(slotId);

            setIsAdding(!isSelected);
            setSelectionStartPoint({ dateIndex, timeIndex });
            setSelectionCurrentPoint({ dateIndex, timeIndex });
            setIsSelecting(true);
            setDragStarted(false);

            if (selectionType === 'path') {
                toggleCellSelection(dateIndex, timeIndex);
            }

            setTouchActiveCell({ dateIndex, timeIndex });
            return;
        }
        
        // スマホでは長押しタイマーを開始
        const timer = setTimeout(() => {
            // 長押し検出時の処理
            e.preventDefault();
            setIsLongPressing(true);
            setLongPressStarted(true);
            
            const slotId = `${dateIndex}-${timeIndex}`;
            const isSelected = selectedSlots.includes(slotId);

            setIsAdding(!isSelected);
            setSelectionStartPoint({ dateIndex, timeIndex });
            setSelectionCurrentPoint({ dateIndex, timeIndex });
            setIsSelecting(true);
            setDragStarted(false);

            if (selectionType === 'path') {
                toggleCellSelection(dateIndex, timeIndex);
            }

            setTouchActiveCell({ dateIndex, timeIndex });
            
            // バイブレーションでフィードバック
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 300); // 300msで長押しと判定
        
        setLongPressTimer(timer);
    };

    // タッチ移動時
    const handleCellTouchMove = (e: React.TouchEvent) => {
        // スマホで長押しタイマーをキャンセル（移動したら長押しではない）
        if (window.innerWidth <= 768 && longPressTimer && !longPressStarted) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        
        // PCか長押し開始後のみ選択処理
        if (window.innerWidth <= 768 && !isLongPressing) {
            return;
        }
        
        if (!isSelecting || e.touches.length !== 1) return;
        
        // 選択中はスクロールを禁止
        e.preventDefault();
        
        const touch = e.touches[0];
        if (!touch) return;
        
        // タッチ座標から該当するセルを特定
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!element) return;
        
        const dateIndex = element.getAttribute('data-date-index');
        const timeIndex = element.getAttribute('data-time-index');
        
        if (dateIndex !== null && timeIndex !== null) {
            const parsedDateIndex = parseInt(dateIndex);
            const parsedTimeIndex = parseInt(timeIndex);
            
            setDragStarted(true);
            setSelectionCurrentPoint({ dateIndex: parsedDateIndex, timeIndex: parsedTimeIndex });
            setTouchActiveCell({ dateIndex: parsedDateIndex, timeIndex: parsedTimeIndex });
        }
    };

    // タッチ終了時
    const handleCellTouchEnd = (e: React.TouchEvent) => {
        // 長押しタイマーをクリア
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        
        // スマホで長押しが開始されていない場合はスクロールを優先
        if (window.innerWidth <= 768 && !isLongPressing) {
            return;
        }
        
        e.preventDefault();
        
        if (isSelecting) {
            // ドラッグしていなかった場合は1マスだけの選択/解除
            if (!dragStarted && selectionStartPoint) {
                const { dateIndex, timeIndex } = selectionStartPoint;
                toggleCellSelection(dateIndex, timeIndex);
            }
        }
        
        // 状態をリセット
        setIsSelecting(false);
        setSelectionStartPoint(null);
        setSelectionCurrentPoint(null);
        setTouchActiveCell(null);
        setIsLongPressing(false);
        setLongPressStarted(false);
    };

    // グローバルなマウス移動の検知（セル外でのドラッグにも対応）
    const handleGlobalMouseMove = () => {
        if (!isSelecting) return;

        // マウスが移動したらドラッグ開始とみなす
        setDragStarted(true);
    };

    // マウスを離した時の処理
    const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();

        if (isSelecting) {
            // ドラッグしていなかった場合は1マスだけの選択/解除
            if (!dragStarted && selectionStartPoint) {
                const { dateIndex, timeIndex } = selectionStartPoint;
                toggleCellSelection(dateIndex, timeIndex);
            }
            // ドラッグしていた場合は範囲選択を確定（既に更新済みなので特に何もしない）
        }

        // 選択操作の終了
        setIsSelecting(false);
        setSelectionStartPoint(null);
        setSelectionCurrentPoint(null);

        // イベントリスナーを削除
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
    };

    // セルの選択状態をトグルする
    const toggleCellSelection = (dateIndex: number, timeIndex: number) => {
        const slotId = `${dateIndex}-${timeIndex}`;

        setSelectedSlots(prev => {
            if (prev.includes(slotId)) {
                return prev.filter(id => id !== slotId);
            } else {
                return [...prev, slotId];
            }
        });
    };

    // 選択状態に基づいて表示を更新（選択中の範囲を含む）
    const getCellStatus = (dateIndex: number, timeIndex: number) => {
        const slotId = `${dateIndex}-${timeIndex}`;
        const availability = getAvailability(participants, slotId);
        const availabilityRatio = participants.length > 0 ? availability / participants.length : 0;

        // 通常の選択状態
        const isSelected = selectedSlots.includes(slotId);

        // 選択操作中かつ範囲選択モードの場合、選択範囲内かどうかをチェック
        let isInActiveSelection = false;

        if (isSelecting && dragStarted && selectionType === 'area' && selectionStartPoint && selectionCurrentPoint) {
            const startDateIndex = Math.min(selectionStartPoint.dateIndex, selectionCurrentPoint.dateIndex);
            const endDateIndex = Math.max(selectionStartPoint.dateIndex, selectionCurrentPoint.dateIndex);
            const startTimeIndex = Math.min(selectionStartPoint.timeIndex, selectionCurrentPoint.timeIndex);
            const endTimeIndex = Math.max(selectionStartPoint.timeIndex, selectionCurrentPoint.timeIndex);

            if (dateIndex >= startDateIndex && dateIndex <= endDateIndex &&
                timeIndex >= startTimeIndex && timeIndex <= endTimeIndex) {
                isInActiveSelection = true;
            }

            // 範囲選択の処理（ドラッグ中に選択状態を更新）
            if (isInActiveSelection && selectionCurrentPoint !== null) {
                // 追加モードでは選択済みでなければ追加、削除モードでは選択済みなら削除
                if (isAdding && !isSelected) {
                    // 遅延なく追加するため、状態更新ではなく直接追加
                    if (!selectedSlots.includes(slotId)) {
                        setSelectedSlots(prev => [...prev, slotId]);
                    }
                } else if (!isAdding && isSelected) {
                    setSelectedSlots(prev => prev.filter(id => id !== slotId));
                }
            }
        }

        return {
            isSelected,
            isInActiveSelection,
            availability,
            availabilityRatio
        };
    };

    // パス選択モードの場合の処理（なぞった部分を選択）
    useEffect(() => {
        if (isSelecting && dragStarted && selectionType === 'path' && selectionCurrentPoint) {
            const { dateIndex, timeIndex } = selectionCurrentPoint;
            const slotId = `${dateIndex}-${timeIndex}`;

            if (isAdding && !selectedSlots.includes(slotId)) {
                setSelectedSlots(prev => [...prev, slotId]);
            } else if (!isAdding && selectedSlots.includes(slotId)) {
                setSelectedSlots(prev => prev.filter(id => id !== slotId));
            }
        }
    }, [selectionCurrentPoint, isSelecting, dragStarted, selectionType, isAdding, selectedSlots]);

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

                <div className="mb-3 px-4 py-3 bg-[var(--secondary)] rounded-lg">
                    <p className="font-medium">💡 アドバイス</p>
                    <p className="text-sm opacity-80">時間枠をクリックして選択、またはドラッグして複数の時間をまとめて選択できます。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* スケジュール表示部分 */}
                    <div className="md:col-span-2">
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">スケジュールを選択</h2>
                            </div>
                            
                            {/* PC用選択モード切り替え */}
                            <div className="hidden md:flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="radio"
                                        id="areaMode"
                                        name="selectionMode"
                                        value="area"
                                        checked={selectionType === 'area'}
                                        onChange={() => setSelectionType('area')}
                                        className="accent-[var(--primary)]"
                                    />
                                    <label htmlFor="areaMode" className="text-sm">範囲選択</label>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="radio"
                                        id="pathMode"
                                        name="selectionMode"
                                        value="path"
                                        checked={selectionType === 'path'}
                                        onChange={() => setSelectionType('path')}
                                        className="accent-[var(--primary)]"
                                    />
                                    <label htmlFor="pathMode" className="text-sm">なぞり選択</label>
                                </div>
                            </div>
                            
                            {/* スマホ用アドバイス */}
                            <div className="md:hidden text-sm opacity-80">
                                📱 スマホ: 長押しで予定選択、通常タップでスクロール
                            </div>
                        </div>

                        <div className="calendar-container mb-4">
                            <div
                                className="calendar-grid"
                                style={{
                                    gridTemplateColumns: `auto ${dates.map(() => '1fr').join(' ')}`
                                }}
                            >
                            {/* 日付ヘッダー */}
                            <div className="time-header sticky top-0 left-0 z-20 bg-[var(--background)] border-b border-r border-[var(--border)]"></div>
                            {dates.map((date, index) => (
                                <div key={index} className="date-header sticky top-0 z-10 bg-[var(--background)] text-center font-bold border-b border-r border-[var(--border)]">
                                    <div className="text-xs">{formatDate(date)}</div>
                                </div>
                            ))}

                            {/* 時間スロット */}
                            {timeSlots.map((time, timeIndex) => (
                                <React.Fragment key={timeIndex}>
                                    <div className="time-label sticky left-0 z-10 bg-[var(--background)] border-b border-r border-[var(--border)] whitespace-nowrap">
                                        <div className="text-xs font-medium">{time}</div>
                                    </div>
                                    {dates.map((_, dateIndex) => {
                                        const { isSelected, isInActiveSelection, availability } = getCellStatus(dateIndex, timeIndex);

                                        const cellClassName = `
                                            time-slot 
                                            border-b 
                                            border-r 
                                            border-[var(--border)] 
                                            ${isSelected ? 'selected' : ''} 
                                            ${isInActiveSelection && dragStarted ? (isAdding ? 'active-selecting' : 'active-deselecting') : ''}
                                            ${availability > 0 ? (availability === participants.length ? 'available' : 'partially') : ''}
                                            relative
                                        `;

                                        // 参加可能人数に応じた色を計算
                                        let availabilityColor = '';
                                        if (availability > 0 && !isSelected && !isInActiveSelection) {
                                            // 最大5段階のグラデーション
                                            const maxSteps = Math.min(5, participants.length);

                                            if (availability <= participants.length - maxSteps) {
                                                // 下位の参加者は灰色
                                                availabilityColor = '#9ca3af'; // グレー
                                            } else {
                                                // 上位5人（または全員）はグラデーション
                                                // 参加者数 - availability が 0 の場合は最大色
                                                // 参加者数 - availability が maxSteps - 1 の場合は最小色
                                                const position = participants.length - availability;
                                                const ratio = 1 - (position / (maxSteps - 1));

                                                // カスタム色からRGB値を抽出
                                                const minRgb = hexToRgb(minColor);
                                                const maxRgb = hexToRgb(maxColor);

                                                if (!minRgb || !maxRgb) {
                                                    availabilityColor = maxColor; // フォールバック
                                                } else {
                                                    const r = Math.round(minRgb.r + (maxRgb.r - minRgb.r) * ratio);
                                                    const g = Math.round(minRgb.g + (maxRgb.g - minRgb.g) * ratio);
                                                    const b = Math.round(minRgb.b + (maxRgb.b - minRgb.b) * ratio);
                                                    availabilityColor = `rgb(${r}, ${g}, ${b})`;
                                                }
                                            }
                                        }

                                        return (
                                            <div
                                                key={dateIndex}
                                                className={
                                                    cellClassName +
                                                    ((touchActiveCell && touchActiveCell.dateIndex === dateIndex && touchActiveCell.timeIndex === timeIndex)
                                                        ? ' touch-active'
                                                        : '')
                                                }
                                                onMouseDown={(e) => handleCellMouseDown(dateIndex, timeIndex, e)}
                                                onMouseEnter={() => handleCellMouseEnter(dateIndex, timeIndex)}
                                                onTouchStart={(e) => handleCellTouchStart(dateIndex, timeIndex, e)}
                                                onTouchMove={handleCellTouchMove}
                                                onTouchEnd={handleCellTouchEnd}
                                                data-date-index={dateIndex}
                                                data-time-index={timeIndex}
                                                style={{
                                                    userSelect: 'none',
                                                    touchAction: 'manipulation',
                                                    WebkitTouchCallout: 'none',
                                                    WebkitUserSelect: 'none',
                                                    // 選択中のエレメントが必ず上に表示されるようにz-indexを設定
                                                    zIndex: isSelecting && (isInActiveSelection || isSelected) ? 10 : 1,
                                                    // 参加者の割合に応じた背景色を設定
                                                    backgroundColor: availabilityColor || undefined
                                                }}
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
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[var(--primary)]"></div>
                                <span className="text-sm">あなたの選択</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4" style={{ backgroundColor: maxColor }}></div>
                                <span className="text-sm">最大参加可能（5人または全員）</span>
                                <input
                                    type="color"
                                    value={maxColor}
                                    onChange={(e) => setMaxColor(e.target.value)}
                                    className="w-6 h-6 cursor-pointer"
                                    title="最大参加時の色を選択"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-4 bg-gradient-to-r" style={{
                                    backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`
                                }}></div>
                                <span className="text-sm">参加可能人数（上位5人まで）</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4" style={{ backgroundColor: minColor }}></div>
                                <span className="text-sm">最小参加（上位5人中の最下位）</span>
                                <input
                                    type="color"
                                    value={minColor}
                                    onChange={(e) => setMinColor(e.target.value)}
                                    className="w-6 h-6 cursor-pointer"
                                    title="最小参加時の色を選択"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#9ca3af]"></div>
                                <span className="text-sm">下位の参加者（灰色）</span>
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
                                        disabled={Boolean(user && participants.find(p => p.id === (user as any).uid))}
                                        className={`input ${Boolean(user && participants.find(p => p.id === (user as any).uid)) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                        title={Boolean(user && participants.find(p => p.id === (user as any).uid)) ? 'このイベントでは氏名は固定されています' : undefined}
                                        placeholder="名前を入力"
                                        required
                                    />
                                    {Boolean(user && participants.find(p => p.id === (user as any).uid)) && (
                                        <p className="text-sm opacity-70 mt-1">このイベントでは氏名は固定されています</p>
                                    )}
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
                                    {participants.map((participant) => (
                                        <li key={participant.id} className="flex items-center justify-between">
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

            <style jsx>{`
                .calendar-container {
                    overflow: auto;
                    max-height: 70vh;
                    max-width: 100%;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    position: relative;
                }
                
                /* スクロールバーのスタイル調整 */
                .calendar-container::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                
                .calendar-container::-webkit-scrollbar-track {
                    background: var(--secondary);
                    border-radius: 3px;
                }
                
                .calendar-container::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 3px;
                }
                
                .calendar-container::-webkit-scrollbar-thumb:hover {
                    background: var(--primary);
                }
                
                /* Firefox用スクロールバー */
                .calendar-container {
                    scrollbar-width: thin;
                    scrollbar-color: var(--border) var(--secondary);
                }
                
                .calendar-grid {
                    display: grid;
                    min-width: max-content;
                }
                
                /* 固定ヘッダー */
                .time-header {
                    min-height: 1.5rem;
                    min-width: 50px;
                    padding: 0.25rem;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .date-header {
                    min-height: 1.5rem;
                    min-width: 40px;
                    padding: 0.25rem;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .time-label {
                    min-height: 1.2rem;
                    min-width: 50px;
                    padding: 0.125rem 0.25rem;
                    font-size: 0.625rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .time-slot {
                    min-height: 1.2rem;
                    min-width: 40px;
                    cursor: pointer;
                    transition: background-color 0.1s;
                    position: relative;
                    border: 0.5px solid var(--border);
                }
                
                .time-slot.selected {
                    background-color: var(--primary) !important;
                    z-index: 5;
                }
                
                .time-slot.active-selecting {
                    background-color: var(--primary) !important;
                    opacity: 0.7;
                    z-index: 10;
                }
                
                .time-slot.active-deselecting {
                    background-color: transparent !important;
                    opacity: 0.5;
                    z-index: 10;
                }
                
                .time-slot:hover {
                    background-color: var(--secondary);
                    z-index: 3;
                }
                
                .time-slot.selected:hover {
                    opacity: 0.9;
                }
                
                /* モバイルデバイス用の調整 */
                @media (max-width: 768px) {
                    .calendar-container {
                        max-height: 60vh;
                    }
                    
                    .time-header {
                        min-width: 45px;
                        min-height: 1.2rem;
                    }
                    
                    .date-header {
                        min-width: 35px;
                        min-height: 1.2rem;
                        font-size: 0.625rem;
                    }
                    
                    .time-label {
                        min-width: 45px;
                        min-height: 1rem;
                        font-size: 0.5rem;
                    }
                    
                    .time-slot {
                        min-width: 35px;
                        min-height: 1rem;
                    }
                }
            `}</style>
            
            <LoginModal 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)}
                title="デモスケジュールに参加"
                description="デモスケジュールに参加するにはログインが必要です。"
            />
        </div>
    );
}

// メインコンポーネント
export default function ScheduleDemo() {
    return (
        <Suspense fallback={<div className="container py-8">読み込み中...</div>}>
            <ScheduleDemoContent />
        </Suspense>
    );
}

// ヘルパー関数
function getDatesInRange(startDate: string, endDate: string): Date[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: Date[] = [];

    const current = start;
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

function getAvailability(participants: { id: string; name: string; slots: string[] }[], slotId: string): number {
    return participants.filter(p => p.slots.includes(slotId)).length;
}

// HEX色コードをRGB値に変換する関数
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    // #で始まる場合は除去
    hex = hex.replace(/^#/, '');

    // 3桁の場合は6桁に変換（例：#f00 → #ff0000）
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // 16進数から10進数に変換
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        }
        : null;
}
