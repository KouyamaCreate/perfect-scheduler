'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/LoginModal';
import { getUserDisplayName } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';

type SelectionPoint = { dateIndex: number, timeIndex: number };

export default function SchedulePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const scheduleId = params.id as string;
    // 既定は編集モード。?mode=view のときのみ閲覧モード
    const isEditMode = (searchParams.get('mode') !== 'view');
    const { user, loading: authLoading, signInAnonymously } = useAuth();

    // 状態管理
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scheduleData, setScheduleData] = useState<{
        name: string;
        description?: string;
        startDate: string;
        endDate: string;
        startTime: string;
        endTime: string;
        duration: number;
        createdAt: Date;
        excludeWeekends?: boolean;
        excludeWeekdays?: boolean;
    } | null>(null);
    const [username, setUsername] = useState('');
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [slotsInitialized, setSlotsInitialized] = useState(false);
    const [participants, setParticipants] = useState<{ id: string; name: string; slots: string[] }[]>([]);
    const [highlightedParticipantId, setHighlightedParticipantId] = useState<string | null>(null);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // カラーカスタマイズ用の状態
    const [minColor, setMinColor] = useState('#dce8ff'); // 少ない時の色（淡い青）
    const [maxColor, setMaxColor] = useState('#73a5ff'); // 多い時の色（濃い青）

    // 選択モード（デフォルトはWhen2Meetと同じく範囲選択）
    const [selectionType, setSelectionType] = useState<'path' | 'area'>('area');
    
    // 選択操作のための状態変数
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStartPoint, setSelectionStartPoint] = useState<SelectionPoint | null>(null);
    const [selectionCurrentPoint, setSelectionCurrentPoint] = useState<SelectionPoint | null>(null);
    const [selectionBaseSlots, setSelectionBaseSlots] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(true);
    const [dragStarted, setDragStarted] = useState(false);
    const [touchActiveCell, setTouchActiveCell] = useState<SelectionPoint | null>(null);
    const [isTouchSelecting, setIsTouchSelecting] = useState(false);
    const activeTouchIdRef = useRef<number | null>(null);
    const touchAbortControllerRef = useRef<AbortController | null>(null);
    const calendarContainerRef = useRef<HTMLDivElement | null>(null);
    const touchClientPointRef = useRef<{ clientX: number; clientY: number } | null>(null);
    const autoScrollFrameRef = useRef<number | null>(null);
    const autoScrollVelocityRef = useRef({ x: 0, y: 0 });
    const twoFingerScrollStateRef = useRef<{
        active: boolean;
        lastMidpoint: { clientX: number; clientY: number } | null;
    }>({
        active: false,
        lastMidpoint: null,
    });
    const selectionStateRef = useRef<{
        isSelecting: boolean;
        dragStarted: boolean;
        selectionStartPoint: SelectionPoint | null;
        selectionCurrentPoint: SelectionPoint | null;
        selectionType: 'path' | 'area';
    }>({
        isSelecting: false,
        dragStarted: false,
        selectionStartPoint: null,
        selectionCurrentPoint: null,
        selectionType: 'area'
    });

    // 認証状態の管理とユーザー名の自動設定
    useEffect(() => {
        if (!authLoading && !user) {
            // 未認証の場合は自動的に匿名ログインを実行
            signInAnonymously().catch(console.error);
        }
    }, [authLoading, user, signInAnonymously]);

    // ユーザー名と選択済みスロットの初期化（既存参加者なら固定＆引き継ぎ）
    useEffect(() => {
        if (!user) return;
        const me = participants.find((p) => p.id === user.uid);
        if (me) {
            if (me.name && username !== me.name) {
                setUsername(me.name);
            }
            // 以前の選択を今回の入力に反映（初回のみ or 未選択時）
            if (!slotsInitialized && selectedSlots.length === 0 && me.slots && me.slots.length > 0) {
                setSelectedSlots(me.slots);
                setSlotsInitialized(true);
            }
            return;
        }
        if (!username) {
            // 初回は表示名を初期値としてセット
            setUsername(getUserDisplayName(user));
        }
    }, [user, username, participants, slotsInitialized, selectedSlots.length]);

    // スケジュールデータの取得
    useEffect(() => {
        // 認証が完了してから読み取り（Firestore ルール対策）
        if (authLoading || !user) return;

        const fetchScheduleData = async () => {
            try {
                const scheduleRef = doc(db, 'schedules', scheduleId);
                const scheduleSnap = await getDoc(scheduleRef);

                if (scheduleSnap.exists()) {
                    const data = scheduleSnap.data();
                    setScheduleData({
                        name: data.name,
                        description: data.description,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        duration: data.duration,
                        createdAt: data.createdAt.toDate(),
                        excludeWeekends: !!data.excludeWeekends,
                        excludeWeekdays: !!data.excludeWeekdays,
                    });
                } else {
                    setError('スケジュールが見つかりませんでした');
                }
            } catch (err) {
                console.error('Error fetching schedule:', err);
                setError('スケジュールの取得中にエラーが発生しました');
            } finally {
                setLoading(false);
            }
        };

        fetchScheduleData();
    }, [scheduleId, user, authLoading]);

    // 初回アクセス時、既に回答済みなら一覧（view）にリダイレクト
    useEffect(() => {
        if (authLoading || !user || !scheduleId) return;
        const modeParam = searchParams.get('mode');
        // 明示的に mode=edit/view が指定されていれば尊重
        if (modeParam === 'edit' || modeParam === 'view') return;

        const participantRef = doc(db, 'schedules', scheduleId, 'participants', user.uid);
        getDoc(participantRef).then((snap) => {
            if (snap.exists()) {
                router.replace(`/schedule/${scheduleId}?mode=view`);
            }
        }).catch((e) => {
            console.error('failed to check participant doc:', e);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, scheduleId]);

    // 参加者データのリアルタイム取得（認証後に購読開始）
    useEffect(() => {
        if (!scheduleId || authLoading || !user) return;

        const participantsRef = collection(db, 'schedules', scheduleId, 'participants');
        const participantsQuery = query(participantsRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(participantsQuery, (snapshot) => {
            // UID（userId or docId）ごとに単純に最新状態を反映（マージは行わない）
            const byUid = new Map<string, { id: string; name: string; slots: string[] }>();
            type ParticipantDoc = { userId?: string; name?: string; slots?: string[] };
            snapshot.docs.forEach((d) => {
                const data = d.data() as ParticipantDoc;
                const uid = (data.userId as string) || d.id;
                byUid.set(uid, {
                    id: uid,
                    name: data.name ?? '',
                    slots: Array.isArray(data?.slots) ? data.slots : [],
                });
            });
            setParticipants(Array.from(byUid.values()));
        }, (err) => {
            console.error('Error getting participants:', err);
        });

        return () => unsubscribe();
    }, [scheduleId, user, authLoading]);

    // 日付と時間スロットの配列を生成
    const dates = scheduleData ? (() => {
        const base = getDatesInRange(scheduleData.startDate, scheduleData.endDate);
        const exW = !!scheduleData.excludeWeekends;
        const exWD = !!scheduleData.excludeWeekdays;
        if (!exW && !exWD) return base;
        return base.filter((d) => {
            const dow = d.getDay(); // 0:日 6:土
            if (exW) return dow !== 0 && dow !== 6; // 平日のみ
            if (exWD) return dow === 0 || dow === 6; // 土日のみ
            return true;
        });
    })() : [];
    const timeSlots = scheduleData ? getTimeSlots(scheduleData.startTime, scheduleData.endTime, scheduleData.duration) : [];
    const highlightedParticipant = highlightedParticipantId
        ? participants.find((participant) => participant.id === highlightedParticipantId) ?? null
        : null;
    const showResponses = !isEditMode;

    useEffect(() => {
        if (highlightedParticipantId && !participants.some((participant) => participant.id === highlightedParticipantId)) {
            setHighlightedParticipantId(null);
        }
    }, [participants, highlightedParticipantId]);

    useEffect(() => {
        selectionStateRef.current = {
            isSelecting,
            dragStarted,
            selectionStartPoint,
            selectionCurrentPoint,
            selectionType
        };
    }, [isSelecting, dragStarted, selectionStartPoint, selectionCurrentPoint, selectionType]);

    useEffect(() => {
        return () => {
            touchAbortControllerRef.current?.abort();
            if (autoScrollFrameRef.current !== null) {
                window.cancelAnimationFrame(autoScrollFrameRef.current);
            }
            document.body.classList.remove('touch-selection-lock');
        };
    }, []);

    const getSlotId = (dateIndex: number, timeIndex: number) => `${dateIndex}-${timeIndex}`;

    const findSlotPointFromElement = (element: Element | null): SelectionPoint | null => {
        const slotElement = element instanceof Element
            ? element.closest<HTMLElement>('[data-slot-cell="true"]')
            : null;

        if (!slotElement) {
            return null;
        }

        const dateIndex = slotElement.getAttribute('data-date-index');
        const timeIndex = slotElement.getAttribute('data-time-index');

        if (dateIndex === null || timeIndex === null) {
            return null;
        }

        return {
            dateIndex: parseInt(dateIndex, 10),
            timeIndex: parseInt(timeIndex, 10),
        };
    };

    const getTouchMidpoint = (touches: ArrayLike<{ clientX: number; clientY: number }>) => {
        if (touches.length < 2) {
            return null;
        }

        const firstTouch = touches[0];
        const secondTouch = touches[1];

        return {
            clientX: (firstTouch.clientX + secondTouch.clientX) / 2,
            clientY: (firstTouch.clientY + secondTouch.clientY) / 2,
        };
    };

    const stopAutoScroll = () => {
        if (autoScrollFrameRef.current !== null) {
            window.cancelAnimationFrame(autoScrollFrameRef.current);
            autoScrollFrameRef.current = null;
        }

        autoScrollVelocityRef.current = { x: 0, y: 0 };
    };

    const getAutoScrollVelocity = (clientX: number, clientY: number) => {
        const container = calendarContainerRef.current;
        if (!container) {
            return { x: 0, y: 0 };
        }

        const rect = container.getBoundingClientRect();
        const edgeThreshold = 48;
        const maxSpeed = 18;

        const computeAxisVelocity = (position: number, start: number, end: number) => {
            if (position < start + edgeThreshold) {
                const distance = Math.max(0, position - start);
                return -Math.ceil((1 - distance / edgeThreshold) * maxSpeed);
            }

            if (position > end - edgeThreshold) {
                const distance = Math.max(0, end - position);
                return Math.ceil((1 - distance / edgeThreshold) * maxSpeed);
            }

            return 0;
        };

        return {
            x: computeAxisVelocity(clientX, rect.left, rect.right),
            y: computeAxisVelocity(clientY, rect.top, rect.bottom),
        };
    };

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

    const applyAreaSelectionFromBase = (baseSlots: string[], areaSlotIds: string[], shouldAdd: boolean) => {
        const areaSlotIdSet = new Set(areaSlotIds);

        if (shouldAdd) {
            const nextSelectedSlots = [...baseSlots];

            areaSlotIds.forEach(slotId => {
                if (!nextSelectedSlots.includes(slotId)) {
                    nextSelectedSlots.push(slotId);
                }
            });

            return nextSelectedSlots;
        }

        return baseSlots.filter(slotId => !areaSlotIdSet.has(slotId));
    };

    const updateTouchSelectionPoint = (clientX: number, clientY: number) => {
        const targetElement = typeof document.elementFromPoint === 'function'
            ? document.elementFromPoint(clientX, clientY)
            : null;
        const point = findSlotPointFromElement(targetElement);

        if (!point) {
            return;
        }

        const currentPoint = selectionStateRef.current.selectionCurrentPoint;
        if (currentPoint &&
            currentPoint.dateIndex === point.dateIndex &&
            currentPoint.timeIndex === point.timeIndex) {
            return;
        }

        setDragStarted(true);
        setSelectionCurrentPoint(point);
        setTouchActiveCell(point);
    };

    const startAutoScroll = () => {
        if (autoScrollFrameRef.current !== null) {
            return;
        }

        const step = () => {
            autoScrollFrameRef.current = null;

            const container = calendarContainerRef.current;
            const touchPoint = touchClientPointRef.current;
            const { x, y } = autoScrollVelocityRef.current;

            if (!container || !touchPoint || !selectionStateRef.current.isSelecting || twoFingerScrollStateRef.current.active) {
                autoScrollVelocityRef.current = { x: 0, y: 0 };
                return;
            }

            if (x === 0 && y === 0) {
                return;
            }

            const previousScrollLeft = container.scrollLeft;
            const previousScrollTop = container.scrollTop;
            container.scrollBy({ left: x, top: y });

            if (container.scrollLeft !== previousScrollLeft || container.scrollTop !== previousScrollTop) {
                updateTouchSelectionPoint(touchPoint.clientX, touchPoint.clientY);
            }

            autoScrollVelocityRef.current = getAutoScrollVelocity(touchPoint.clientX, touchPoint.clientY);

            if (autoScrollVelocityRef.current.x !== 0 || autoScrollVelocityRef.current.y !== 0) {
                autoScrollFrameRef.current = window.requestAnimationFrame(step);
            }
        };

        autoScrollFrameRef.current = window.requestAnimationFrame(step);
    };

    const beginSelection = (dateIndex: number, timeIndex: number) => {
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
    };

    const clearTouchInteraction = () => {
        touchAbortControllerRef.current?.abort();
        touchAbortControllerRef.current = null;
        activeTouchIdRef.current = null;
        touchClientPointRef.current = null;
        setTouchActiveCell(null);
        setIsTouchSelecting(false);
        stopAutoScroll();
        document.body.classList.remove('touch-selection-lock');
    };

    const finishSelection = (shouldApplySingleCellToggle = true) => {
        const {
            isSelecting: selectingNow,
            dragStarted: dragStartedNow,
            selectionStartPoint: startPoint,
            selectionType: currentSelectionType,
        } = selectionStateRef.current;

        if (shouldApplySingleCellToggle && selectingNow && !dragStartedNow && startPoint && currentSelectionType === 'area') {
            const { dateIndex, timeIndex } = startPoint;
            toggleCellSelection(dateIndex, timeIndex);
        }

        setIsSelecting(false);
        setSelectionStartPoint(null);
        setSelectionCurrentPoint(null);
        setSelectionBaseSlots([]);
        clearTouchInteraction();
    };

    const beginTwoFingerScroll = (touches: ArrayLike<{ clientX: number; clientY: number }>) => {
        const midpoint = getTouchMidpoint(touches);
        if (!midpoint) {
            return;
        }

        if (selectionStateRef.current.isSelecting) {
            finishSelection(false);
        }

        touchClientPointRef.current = null;
        stopAutoScroll();
        twoFingerScrollStateRef.current = {
            active: true,
            lastMidpoint: midpoint,
        };
    };

    const handleCalendarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length < 2) {
            return;
        }

        e.preventDefault();
        beginTwoFingerScroll(e.touches);
    };

    const handleCalendarTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!twoFingerScrollStateRef.current.active || e.touches.length < 2) {
            return;
        }

        const midpoint = getTouchMidpoint(e.touches);
        const lastMidpoint = twoFingerScrollStateRef.current.lastMidpoint;
        const container = calendarContainerRef.current;

        if (!midpoint || !lastMidpoint || !container) {
            return;
        }

        e.preventDefault();
        container.scrollLeft -= midpoint.clientX - lastMidpoint.clientX;
        container.scrollTop -= midpoint.clientY - lastMidpoint.clientY;
        twoFingerScrollStateRef.current.lastMidpoint = midpoint;
    };

    const handleCalendarTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length >= 2) {
            twoFingerScrollStateRef.current.lastMidpoint = getTouchMidpoint(e.touches);
            return;
        }

        twoFingerScrollStateRef.current = {
            active: false,
            lastMidpoint: null,
        };
    };

    // 参加者を追加する
    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 認証チェック
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        if (!username || selectedSlots.length === 0) return;

        try {
            // ドキュメントIDを user.uid に固定し、同一ユーザーを一意化
            const participantRef = doc(db, 'schedules', scheduleId, 'participants', user.uid);

            // 既存ドキュメントがあればその氏名を維持（固定）
            const existingSnap = await getDoc(participantRef);
            const fixedName = existingSnap.exists() ? (existingSnap.data().name as string) : username;

            await setDoc(
                participantRef,
                {
                    userId: user.uid,
                    name: fixedName,
                    slots: [...selectedSlots],
                    createdAt: existingSnap.exists() ? existingSnap.data().createdAt ?? new Date() : new Date(),
                    updatedAt: new Date(),
                },
                { merge: true }
            );

            // 編集モードでは保存後に一覧ページへ戻す
            if (isEditMode) {
                router.push(`/schedule/${scheduleId}?mode=view`);
            }
        } catch (err) {
            console.error('Error adding participant:', err);
            alert('参加情報の登録中にエラーが発生しました');
        }
    };

    // セルをクリックした時の処理（選択開始）
    const handleCellMouseDown = (dateIndex: number, timeIndex: number, e: React.MouseEvent) => {
        if (!isEditMode) return; // 一覧ページでは編集不可
        e.preventDefault();
        beginSelection(dateIndex, timeIndex);

        // マウスアップイベントをwindowに設定
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleGlobalMouseMove);
    };

    // マウス移動時の処理（セル上）
    const handleCellMouseEnter = (dateIndex: number, timeIndex: number) => {
        if (!isEditMode) return; // 一覧ページでは編集不可
        if (!isSelecting) return;

        // ドラッグ開始フラグを立てる
        setDragStarted(true);

        // 現在位置を更新
        setSelectionCurrentPoint({ dateIndex, timeIndex });
    };

    // タッチ開始時
    const handleCellTouchStart = (dateIndex: number, timeIndex: number, e: React.TouchEvent) => {
        if (!isEditMode) return; // 一覧ページでは編集不可
        if (e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        clearTouchInteraction();
        activeTouchIdRef.current = touch.identifier;
        touchClientPointRef.current = {
            clientX: touch.clientX,
            clientY: touch.clientY,
        };
        setIsTouchSelecting(true);
        setTouchActiveCell({ dateIndex, timeIndex });
        document.body.classList.add('touch-selection-lock');
        beginSelection(dateIndex, timeIndex);

        const controller = new AbortController();
        touchAbortControllerRef.current = controller;

        window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false, signal: controller.signal });
        window.addEventListener('touchend', handleGlobalTouchEnd, { passive: false, signal: controller.signal });
        window.addEventListener('touchcancel', handleGlobalTouchCancel, { passive: false, signal: controller.signal });
    };

    // グローバルなマウス移動の検知（セル外でのドラッグにも対応）
    const handleGlobalMouseMove = () => {
        if (!selectionStateRef.current.isSelecting) return;

        // マウスが移動したらドラッグ開始とみなす
        setDragStarted(true);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
        const activeTouchId = activeTouchIdRef.current;
        if (activeTouchId === null || !selectionStateRef.current.isSelecting || twoFingerScrollStateRef.current.active) return;

        const touch = Array.from(e.touches).find((currentTouch) => currentTouch.identifier === activeTouchId);
        if (!touch) return;

        e.preventDefault();
        touchClientPointRef.current = {
            clientX: touch.clientX,
            clientY: touch.clientY,
        };
        updateTouchSelectionPoint(touch.clientX, touch.clientY);
        autoScrollVelocityRef.current = getAutoScrollVelocity(touch.clientX, touch.clientY);

        if (autoScrollVelocityRef.current.x !== 0 || autoScrollVelocityRef.current.y !== 0) {
            startAutoScroll();
        } else {
            stopAutoScroll();
        }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
        const activeTouchId = activeTouchIdRef.current;
        if (activeTouchId === null) return;

        const isActiveTouchEnded = Array.from(e.changedTouches).some(
            (currentTouch) => currentTouch.identifier === activeTouchId
        );
        if (!isActiveTouchEnded) return;

        e.preventDefault();
        finishSelection();
    };

    const handleGlobalTouchCancel = (e: TouchEvent) => {
        const activeTouchId = activeTouchIdRef.current;
        if (activeTouchId === null) return;

        const isActiveTouchCanceled = Array.from(e.changedTouches).some(
            (currentTouch) => currentTouch.identifier === activeTouchId
        );
        if (!isActiveTouchCanceled) return;

        finishSelection(false);
    };

    // マウスを離した時の処理
    const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        finishSelection();

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
        setSelectedSlots(applyAreaSelectionFromBase(selectionBaseSlots, areaSlotIds, isAdding));
    }, [dragStarted, isAdding, isSelecting, selectionBaseSlots, selectionCurrentPoint, selectionStartPoint, selectionType]);

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
                activeSelectionClass = isAdding ? 'active-selecting' : 'active-deselecting';
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

    // シェアリンクをコピーする（クエリなしの基本URLをコピー）
    const copyShareLink = () => {
        const baseUrl = `${window.location.origin}/schedule/${scheduleId}`;
        navigator.clipboard.writeText(baseUrl);
        setShareLink(baseUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // シェアリンクは常にクエリのない基本URLを表示
    useEffect(() => {
        if (!scheduleId) return;
        const baseUrl = `${window.location.origin}/schedule/${scheduleId}`;
        setShareLink(baseUrl);
    }, [scheduleId]);

        if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="surface-card px-6 py-5 text-center">
                    <p className="text-sm text-[var(--foreground-muted)]">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error || !scheduleData) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="surface-card flex max-w-md flex-col items-center gap-4 px-6 py-6 text-center">
                <p className="text-[#dc1e32]">{error || 'エラーが発生しました'}</p>
                <Link href="/" className="mt-4 btn btn-primary">
                    ホームに戻る
                </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <AppHeader />

            <main className="flex-1 container py-10">
                <div className="surface-card mb-6 p-6 md:p-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="eyebrow mb-3">Meetrace</p>
                            <h1 className="mb-2 text-[2rem] font-bold text-[var(--foreground)]">{scheduleData.name}</h1>
                            {scheduleData.description && <p className="max-w-3xl text-base leading-7 text-[var(--foreground-muted)]">{scheduleData.description}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {dates.length > 0 && (
                                <span className="status-pill">
                                    {formatDate(dates[0])} - {formatDate(dates[dates.length - 1])}
                                </span>
                            )}
                            <span className="status-pill">{scheduleData.startTime} - {scheduleData.endTime}</span>
                            {showResponses && <span className="status-pill">{participants.length}人が回答中</span>}
                            {showResponses && highlightedParticipant && (
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
                            
                            <div className="grid grid-cols-2 gap-3 md:flex md:items-center">
                                <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 ${
                                    selectionType === 'area'
                                        ? 'border-[#aac8ff] bg-[var(--primary-soft)]'
                                        : 'border-[var(--border)] bg-white'
                                }`}>
                                    <input
                                        type="radio"
                                        id="areaMode"
                                        name="selectionMode"
                                        value="area"
                                        checked={selectionType === 'area'}
                                        onChange={() => setSelectionType('area')}
                                        className="accent-[var(--primary)]"
                                    />
                                    <span className="text-sm font-medium text-[var(--foreground)]">範囲選択</span>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 ${
                                    selectionType === 'path'
                                        ? 'border-[#aac8ff] bg-[var(--primary-soft)]'
                                        : 'border-[var(--border)] bg-white'
                                }`}>
                                    <input
                                        type="radio"
                                        id="pathMode"
                                        name="selectionMode"
                                        value="path"
                                        checked={selectionType === 'path'}
                                        onChange={() => setSelectionType('path')}
                                        className="accent-[var(--primary)]"
                                    />
                                    <span className="text-sm font-medium text-[var(--foreground)]">なぞり選択</span>
                                </label>
                            </div>
                            
                            <div className="md:hidden rounded-xl bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
                                マスはタップ/ドラッグでそのまま選択でき、端まで引くと自動でスクロールします。移動したい時は上の日付帯・左の時刻帯、または表の上で2本指スクロールを使ってください。
                            </div>
                        </div>

                        <div className="surface-card mb-4 p-3 md:p-4">
                        <div
                            ref={calendarContainerRef}
                            className={`calendar-container ${isTouchSelecting ? 'touch-selecting' : ''}`}
                            onTouchStart={handleCalendarTouchStart}
                            onTouchMove={handleCalendarTouchMove}
                            onTouchEnd={handleCalendarTouchEnd}
                            onTouchCancel={handleCalendarTouchEnd}
                        >
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
                                        const baseStatus = getCellStatus(dateIndex, timeIndex);
                                        const isSelected = isEditMode ? baseStatus.isSelected : false;
                                        const isInActiveSelection = isEditMode ? baseStatus.isInActiveSelection : false;
                                        const activeSelectionClass = baseStatus.activeSelectionClass;
                                        const availability = baseStatus.availability;
                                        const isHighlightedParticipantSlot = showResponses && (highlightedParticipant?.slots.includes(slotId) ?? false);

                                        const cellClassName = `
                                            time-slot 
                                            border-b 
                                            border-r 
                                            border-[var(--border)] 
                                            ${isSelected ? 'selected' : ''} 
                                            ${isInActiveSelection && dragStarted ? activeSelectionClass : ''}
                                            ${showResponses && availability > 0 ? (availability === participants.length ? 'available' : 'partially') : ''}
                                            relative
                                        `;

                                        // 参加可能人数に応じた色を計算
                                        let availabilityColor = '';
                                        if (showResponses && availability > 0 && !(isSelected || isInActiveSelection)) {
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
                                                data-slot-cell="true"
                                                data-date-index={dateIndex}
                                                data-time-index={timeIndex}
                                                style={{
                                                    userSelect: 'none',
                                                    touchAction: isEditMode ? 'none' : 'manipulation',
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
                                                {showResponses && availability > 0 && (
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
                            {isEditMode && (
                              <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 rounded-sm bg-[var(--primary)]"></div>
                                  <span className="text-sm text-[var(--foreground-muted)]">あなたの選択</span>
                              </div>
                            )}
                            {showResponses && (
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
                            )}
                            {showResponses && (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-10 rounded-sm bg-gradient-to-r" style={{
                                    backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`
                                }}></div>
                                <span className="text-sm text-[var(--foreground-muted)]">青の濃淡で重なりを表示</span>
                            </div>
                            )}
                            {showResponses && (
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
                            )}
                            {showResponses && (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-sm bg-[#ebf3ff]"></div>
                                <span className="text-sm text-[var(--foreground-muted)]">その他の候補</span>
                            </div>
                            )}
                            {showResponses && highlightedParticipant && (
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
                            <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">{isEditMode ? '参加情報を編集' : '参加情報'}</h2>
                            {isEditMode ? (
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
                                <div className="mt-3 text-center">
                                    <button type="button" className="text-sm text-[var(--primary)] underline" onClick={() => router.push(`/schedule/${scheduleId}?mode=view`)}>一覧に戻る</button>
                                </div>
                            </form>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-[var(--foreground-muted)]">あなたの回答を編集するには編集ページへ移動してください。</p>
                                    <button className="btn btn-secondary" onClick={() => router.push(`/schedule/${scheduleId}?mode=edit`)}>回答を編集</button>
                                </div>
                            )}
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

                        {showResponses && (
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
                        )}
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
                    overscroll-behavior: contain;
                    -webkit-overflow-scrolling: touch;
                }

                .calendar-container.touch-selecting {
                    overscroll-behavior: none;
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
                    touch-action: auto;
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
                    touch-action: pan-x;
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
                    touch-action: pan-y;
                }
                
                .time-slot {
                    min-height: 1.2rem;
                    min-width: 40px;
                    cursor: pointer;
                    transition: background-color 0.1s;
                    position: relative;
                    border: 0.5px solid #e7edf8;
                    touch-action: none;
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

                :global(body.touch-selection-lock) {
                    overflow: hidden;
                    overscroll-behavior: none;
                }
            `}</style>
            
            <LoginModal 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)}
                title="スケジュールに参加"
                description="スケジュールに参加するにはログインが必要です。"
            />
        </div>
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
