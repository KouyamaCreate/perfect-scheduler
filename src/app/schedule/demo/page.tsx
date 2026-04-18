'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/LoginModal';
import { getUserDisplayName } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';

type SelectionPoint = { dateIndex: number, timeIndex: number };

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
    const [highlightedParticipantId, setHighlightedParticipantId] = useState<string | null>(null);
    const [slotsInitialized, setSlotsInitialized] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // カラーカスタマイズ用の状態
    const [minColor, setMinColor] = useState('#dce8ff'); // 少ない時の色（淡い青）
    const [maxColor, setMaxColor] = useState('#73a5ff'); // 多い時の色（濃い青）

    // 選択モード（デフォルトはWhen2Meetと同じく範囲選択）
    const [selectionType, setSelectionType] = useState<'path' | 'area'>('area');
    
    // 長押し関連のstate
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const [longPressStarted, setLongPressStarted] = useState(false);

    // 選択操作のための状態変数
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStartPoint, setSelectionStartPoint] = useState<SelectionPoint | null>(null);
    const [selectionCurrentPoint, setSelectionCurrentPoint] = useState<SelectionPoint | null>(null);
    const [selectionBaseSlots, setSelectionBaseSlots] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(true);
    const [dragStarted, setDragStarted] = useState(false);
    const selectionStateRef = useRef<{
        isSelecting: boolean;
        dragStarted: boolean;
        selectionStartPoint: SelectionPoint | null;
        selectionType: 'path' | 'area';
    }>({
        isSelecting: false,
        dragStarted: false,
        selectionStartPoint: null,
        selectionType: 'area'
    });

    // 日付と時間スロットの配列を生成
    const dates = getDatesInRange(startDate, endDate);
    const timeSlots = getTimeSlots(startTime, endTime, duration);
    const highlightedParticipant = highlightedParticipantId
        ? participants.find((participant) => participant.id === highlightedParticipantId) ?? null
        : null;

    useEffect(() => {
        if (highlightedParticipantId && !participants.some((participant) => participant.id === highlightedParticipantId)) {
            setHighlightedParticipantId(null);
        }
    }, [participants, highlightedParticipantId]);

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

    useEffect(() => {
        selectionStateRef.current = {
            isSelecting,
            dragStarted,
            selectionStartPoint,
            selectionType
        };
    }, [isSelecting, dragStarted, selectionStartPoint, selectionType]);

    const getSlotId = (dateIndex: number, timeIndex: number) => `${dateIndex}-${timeIndex}`;

    const getAreaSlotIds = (startPoint: SelectionPoint, endPoint: SelectionPoint) => {
        const startDateIndex = Math.min(startPoint.dateIndex, endPoint.dateIndex);
        const endDateIndex = Math.max(startPoint.dateIndex, endPoint.dateIndex);
        const startTimeIndex = Math.min(startPoint.timeIndex, endPoint.timeIndex);
        const endTimeIndex = Math.max(startPoint.timeIndex, endPoint.timeIndex);
        const slotIds: string[] = [];

        for (let dateIndex = startDateIndex; dateIndex <= endDateIndex; dateIndex += 1) {
            for (let timeIndex = startTimeIndex; timeIndex <= endTimeIndex; timeIndex += 1) {
                slotIds.push(getSlotId(dateIndex, timeIndex));
            }
        }

        return slotIds;
    };

    const toggleSlotsFromBaseSelection = (baseSlots: string[], toggledSlotIds: string[]) => {
        const toggledSlotIdSet = new Set(toggledSlotIds);
        const nextSelectedSlots = baseSlots.filter(slotId => !toggledSlotIdSet.has(slotId));
        const baseSlotIdSet = new Set(baseSlots);

        toggledSlotIds.forEach(slotId => {
            if (!baseSlotIdSet.has(slotId)) {
                nextSelectedSlots.push(slotId);
            }
        });

        return nextSelectedSlots;
    };

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

        const slotId = getSlotId(dateIndex, timeIndex);
        const isSelected = selectedSlots.includes(slotId);

        // 追加モード or 削除モードを決定
        setIsAdding(!isSelected);

        // 選択操作の開始ポイントを記録
        setSelectionBaseSlots(selectedSlots);
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
    const [touchActiveCell, setTouchActiveCell] = useState<SelectionPoint | null>(null);

    // タッチ開始時
    const handleCellTouchStart = (dateIndex: number, timeIndex: number, e: React.TouchEvent) => {
        // シングルタッチのみ処理
        if (e.touches.length !== 1) return;
        
        // PCでは従来通りの処理
        if (window.innerWidth > 768) {
            e.preventDefault();
            const slotId = getSlotId(dateIndex, timeIndex);
            const isSelected = selectedSlots.includes(slotId);

            setIsAdding(!isSelected);
            setSelectionBaseSlots(selectedSlots);
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
            
            const slotId = getSlotId(dateIndex, timeIndex);
            const isSelected = selectedSlots.includes(slotId);

            setIsAdding(!isSelected);
            setSelectionBaseSlots(selectedSlots);
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
            if (!dragStarted && selectionStartPoint && selectionType === 'area') {
                const { dateIndex, timeIndex } = selectionStartPoint;
                toggleCellSelection(dateIndex, timeIndex);
            }
        }
        setIsSelecting(false);
        setSelectionStartPoint(null);
        setSelectionCurrentPoint(null);
        setSelectionBaseSlots([]);
        setTouchActiveCell(null);
        setIsLongPressing(false);
        setLongPressStarted(false);
    };

    // グローバルなマウス移動の検知（セル外でのドラッグにも対応）
    const handleGlobalMouseMove = () => {
        if (!selectionStateRef.current.isSelecting) return;

        // マウスが移動したらドラッグ開始とみなす
        setDragStarted(true);
    };

    // マウスを離した時の処理
    const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();

        const { isSelecting: selectingNow, dragStarted: dragStartedNow, selectionStartPoint: startPoint, selectionType: currentSelectionType } = selectionStateRef.current;

        if (selectingNow) {
            // ドラッグしていなかった場合は1マスだけの選択/解除
            if (!dragStartedNow && startPoint && currentSelectionType === 'area') {
                const { dateIndex, timeIndex } = startPoint;
                toggleCellSelection(dateIndex, timeIndex);
            }
            // ドラッグしていた場合は範囲選択を確定（既に更新済みなので特に何もしない）
        }

        // 選択操作の終了
        setIsSelecting(false);
        setSelectionStartPoint(null);
        setSelectionCurrentPoint(null);
        setSelectionBaseSlots([]);

        // イベントリスナーを削除
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
    };

    // セルの選択状態をトグルする
    const toggleCellSelection = (dateIndex: number, timeIndex: number) => {
        const slotId = getSlotId(dateIndex, timeIndex);

        setSelectedSlots(prev => {
            if (prev.includes(slotId)) {
                return prev.filter(id => id !== slotId);
            } else {
                return [...prev, slotId];
            }
        });
    };

    useEffect(() => {
        if (!(isSelecting && dragStarted && selectionType === 'area' && selectionStartPoint && selectionCurrentPoint)) {
            return;
        }

        const areaSlotIds = getAreaSlotIds(selectionStartPoint, selectionCurrentPoint);
        setSelectedSlots(toggleSlotsFromBaseSelection(selectionBaseSlots, areaSlotIds));
    }, [dragStarted, isSelecting, selectionBaseSlots, selectionCurrentPoint, selectionStartPoint, selectionType]);

    // 選択状態に基づいて表示を更新（選択中の範囲を含む）
    const getCellStatus = (dateIndex: number, timeIndex: number) => {
        const slotId = getSlotId(dateIndex, timeIndex);
        const availability = getAvailability(participants, slotId);
        const availabilityRatio = participants.length > 0 ? availability / participants.length : 0;

        // 通常の選択状態
        const isSelected = selectedSlots.includes(slotId);

        // 選択操作中かつ範囲選択モードの場合、選択範囲内かどうかをチェック
        let isInActiveSelection = false;
        let activeSelectionClass = '';

        if (isSelecting && dragStarted && selectionType === 'area' && selectionStartPoint && selectionCurrentPoint) {
            const startDateIndex = Math.min(selectionStartPoint.dateIndex, selectionCurrentPoint.dateIndex);
            const endDateIndex = Math.max(selectionStartPoint.dateIndex, selectionCurrentPoint.dateIndex);
            const startTimeIndex = Math.min(selectionStartPoint.timeIndex, selectionCurrentPoint.timeIndex);
            const endTimeIndex = Math.max(selectionStartPoint.timeIndex, selectionCurrentPoint.timeIndex);

            if (dateIndex >= startDateIndex && dateIndex <= endDateIndex &&
                timeIndex >= startTimeIndex && timeIndex <= endTimeIndex) {
                isInActiveSelection = true;
                activeSelectionClass = selectionBaseSlots.includes(slotId)
                    ? 'active-deselecting'
                    : 'active-selecting';
            }
        }

        return {
            isSelected,
            isInActiveSelection,
            activeSelectionClass,
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
            <AppHeader />

            <main className="flex-1 container py-10">
                <div className="surface-card mb-6 p-6 md:p-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="eyebrow mb-3">Meetrace Demo</p>
                            <h1 className="mb-2 text-[2rem] font-bold text-[var(--foreground)]">{eventName}</h1>
                            {description && <p className="max-w-3xl text-base leading-7 text-[var(--foreground-muted)]">{description}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {dates.length > 0 && (
                                <span className="status-pill">
                                    {formatDate(dates[0])} - {formatDate(dates[dates.length - 1])}
                                </span>
                            )}
                            <span className="status-pill">{startTime} - {endTime}</span>
                            <span className="status-pill">{participants.length}人が回答中</span>
                            {highlightedParticipant && (
                                <span className="status-pill border-[#aac8ff] bg-[var(--primary-soft)] text-[var(--primary)]">
                                    {highlightedParticipant.name}を強調表示中
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="soft-panel mb-6 px-4 py-4 md:px-5">
                    <p className="mb-1 text-sm font-bold text-[var(--primary-strong)]">ドラッグ操作のヒント</p>
                    <p className="text-sm leading-6 text-[var(--foreground-muted)]">時間枠をクリックして選択、またはドラッグして複数の時間をまとめて選択できます。</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <div className="mb-4 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-[var(--foreground)]">候補時間を選択</h2>
                            </div>
                            
                            <div className="hidden md:flex items-center gap-3">
                                <div className="rounded-full border border-[#aac8ff] bg-[var(--primary-soft)] px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="areaMode"
                                        name="selectionMode"
                                        value="area"
                                        checked={selectionType === 'area'}
                                        onChange={() => setSelectionType('area')}
                                        className="accent-[var(--primary)]"
                                    />
                                    <label htmlFor="areaMode" className="text-sm font-medium text-[var(--foreground)]">範囲選択</label>
                                </div>
                                </div>
                                <div className="rounded-full border border-[var(--border)] bg-white px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="pathMode"
                                        name="selectionMode"
                                        value="path"
                                        checked={selectionType === 'path'}
                                        onChange={() => setSelectionType('path')}
                                        className="accent-[var(--primary)]"
                                    />
                                    <label htmlFor="pathMode" className="text-sm font-medium text-[var(--foreground)]">なぞり選択</label>
                                </div>
                                </div>
                            </div>
                            
                            <div className="md:hidden rounded-xl bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
                                📱 スマホ: 長押しで予定選択、通常タップでスクロール
                            </div>
                        </div>

                        <div className="surface-card mb-4 p-3 md:p-4">
                        <div className="calendar-container">
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
                                        const slotId = getSlotId(dateIndex, timeIndex);
                                        const { isSelected, isInActiveSelection, activeSelectionClass, availability } = getCellStatus(dateIndex, timeIndex);
                                        const isHighlightedParticipantSlot = highlightedParticipant?.slots.includes(slotId) ?? false;

                                        const cellClassName = `
                                            time-slot 
                                            border-b 
                                            border-r 
                                            border-[var(--border)] 
                                            ${isSelected ? 'selected' : ''} 
                                            ${isInActiveSelection && dragStarted ? activeSelectionClass : ''}
                                            ${availability > 0 ? (availability === participants.length ? 'available' : 'partially') : ''}
                                            relative
                                        `;

                                        // 参加可能人数に応じた色を計算
                                        let availabilityColor = '';
                                        if (availability > 0 && !isSelected && !isInActiveSelection) {
                                            // 最大5段階のグラデーション
                                            const maxSteps = Math.min(5, participants.length);

                                            if (availability <= participants.length - maxSteps) {
                                                // 下位の参加者は淡い青
                                                availabilityColor = '#ebf3ff';
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
                                                    zIndex: isSelecting && (isInActiveSelection || isSelected) ? 10 : isHighlightedParticipantSlot ? 4 : 1,
                                                    // 参加者の割合に応じた背景色を設定
                                                    backgroundColor: availabilityColor || undefined,
                                                    color: isSelected || (isInActiveSelection && dragStarted) ? '#ffffff' : undefined,
                                                    boxShadow: isHighlightedParticipantSlot
                                                        ? 'inset 0 0 0 2px rgba(34, 92, 197, 0.98), inset 0 0 0 4px rgba(255, 255, 255, 0.72)'
                                                        : undefined
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
                        </div>

                        <div className="surface-card mb-8 flex flex-wrap items-center gap-4 p-4">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-sm bg-[var(--primary)]"></div>
                                <span className="text-sm text-[var(--foreground-muted)]">あなたの選択</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: maxColor }}></div>
                                <span className="text-sm text-[var(--foreground-muted)]">重なりが大きい候補</span>
                                <input
                                    type="color"
                                    value={maxColor}
                                    onChange={(e) => setMaxColor(e.target.value)}
                                    className="w-6 h-6 cursor-pointer"
                                    title="最大参加時の色を選択"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-10 rounded-sm bg-gradient-to-r" style={{
                                    backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`
                                }}></div>
                                <span className="text-sm text-[var(--foreground-muted)]">青の濃淡で重なりを表示</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: minColor }}></div>
                                <span className="text-sm text-[var(--foreground-muted)]">重なりが小さい候補</span>
                                <input
                                    type="color"
                                    value={minColor}
                                    onChange={(e) => setMinColor(e.target.value)}
                                    className="w-6 h-6 cursor-pointer"
                                    title="最小参加時の色を選択"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-sm bg-[#ebf3ff]"></div>
                                <span className="text-sm text-[var(--foreground-muted)]">その他の候補</span>
                            </div>
                            {highlightedParticipant && (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-4 w-4 rounded-sm bg-white"
                                        style={{ boxShadow: 'inset 0 0 0 2px rgba(34, 92, 197, 0.98), inset 0 0 0 4px rgba(255, 255, 255, 0.72)' }}
                                    ></div>
                                    <span className="text-sm text-[var(--foreground-muted)]">{highlightedParticipant.name}の選択</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="surface-card mb-6 p-5">
                            <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">参加情報を入力</h2>
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
                                        disabled={Boolean(user?.uid && participants.find(p => p.id === user?.uid))}
                                        className={`input ${Boolean(user?.uid && participants.find(p => p.id === user?.uid)) ? 'bg-[#f7f5f5] text-[var(--foreground-subtle)] cursor-not-allowed' : ''}`}
                                        title={Boolean(user?.uid && participants.find(p => p.id === user?.uid)) ? 'このイベントでは氏名は固定されています' : undefined}
                                        placeholder="名前を入力"
                                        required
                                    />
                                    {Boolean(user?.uid && participants.find(p => p.id === user?.uid)) && (
                                        <p className="mt-1 text-sm text-[var(--foreground-muted)]">このイベントでは氏名は固定されています</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <p className="block font-medium mb-2">
                                        選択済み時間枠: {selectedSlots.length}
                                    </p>
                                    <p className="text-sm text-[var(--foreground-muted)]">
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

                        <div className="surface-card mb-6 p-5">
                            <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">スケジュールを共有</h2>
                            <div className="flex flex-col mb-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={shareLink}
                                        readOnly
                                        className="input pr-16"
                                    />
                                    <button
                                        onClick={copyShareLink}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]"
                                    >
                                        {copied ? '✓' : 'コピー'}
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                                    このリンクを共有して、参加者を招待しましょう
                                </p>
                            </div>
                        </div>

                        <div className="surface-card p-5">
                            <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">参加者一覧 ({participants.length})</h2>
                            {participants.length > 0 ? (
                                <ul className="space-y-2">
                                    {participants.map((participant) => (
                                        <li key={participant.id}>
                                            <button
                                                type="button"
                                                onClick={() => setHighlightedParticipantId((current) => current === participant.id ? null : participant.id)}
                                                aria-pressed={highlightedParticipantId === participant.id}
                                                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                                    highlightedParticipantId === participant.id
                                                        ? 'border-[#73a5ff] bg-[var(--primary-soft)] shadow-[0_12px_32px_rgba(69,113,191,0.14)]'
                                                        : 'border-transparent bg-[var(--secondary)] hover:border-[#aac8ff] hover:bg-[var(--primary-soft)]'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <span className="font-medium text-[var(--foreground)]">{participant.name}</span>
                                                            <span className="text-sm text-[var(--foreground-muted)]">
                                                                {participant.slots.length}枠選択
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                                                            {highlightedParticipantId === participant.id
                                                                ? '強調表示中。もう一度押すと解除できます。'
                                                                : 'クリックでこの参加者の候補時間を強調表示します。'}
                                                        </p>
                                                    </div>
                                                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                                                        highlightedParticipantId === participant.id
                                                            ? 'bg-white text-[var(--primary)]'
                                                            : 'bg-white text-[var(--foreground-muted)]'
                                                    }`}>
                                                        {highlightedParticipantId === participant.id ? '表示中' : '表示'}
                                                    </span>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[var(--foreground-muted)]">まだ参加者はいません</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-[var(--border)] py-6">
                <div className="container text-center">
                    <p className="text-sm text-[var(--foreground-muted)]">
                        © 2025 Meetrace. All rights reserved.
                    </p>
                </div>
            </footer>

            <style jsx>{`
                .calendar-container {
                    overflow: auto;
                    max-height: 70vh;
                    max-width: 100%;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    background: #ffffff;
                    position: relative;
                }
                
                /* スクロールバーのスタイル調整 */
                .calendar-container::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                
                .calendar-container::-webkit-scrollbar-track {
                    background: #f7f9fc;
                    border-radius: 3px;
                }
                
                .calendar-container::-webkit-scrollbar-thumb {
                    background: #aac8ff;
                    border-radius: 3px;
                }
                
                .calendar-container::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-hover);
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
                    color: var(--foreground-muted);
                }
                
                .date-header {
                    min-height: 1.5rem;
                    min-width: 40px;
                    padding: 0.25rem;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8fbff;
                    color: var(--primary-strong);
                }
                
                .time-label {
                    min-height: 1.2rem;
                    min-width: 50px;
                    padding: 0.125rem 0.25rem;
                    font-size: 0.625rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8fbff;
                    color: var(--foreground-muted);
                }
                
                .time-slot {
                    min-height: 1.2rem;
                    min-width: 40px;
                    cursor: pointer;
                    transition: background-color 0.1s;
                    position: relative;
                    border: 0.5px solid #e7edf8;
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
                    background-color: var(--primary-soft);
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
