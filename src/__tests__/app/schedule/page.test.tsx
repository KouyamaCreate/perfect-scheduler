import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import SchedulePage from '@/app/schedule/[id]/page';
import { getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// next/navigationのモック
jest.mock('next/navigation', () => ({
    useParams: jest.fn(),
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/components/AppHeader', () => ({
    AppHeader: () => <div>AppHeader</div>,
}));

jest.mock('@/components/LoginModal', () => ({
    LoginModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>LoginModal</div> : null),
}));

jest.mock('@/lib/auth', () => ({
    getUserDisplayName: jest.fn().mockReturnValue('テストログインユーザー'),
}));

jest.mock('html-to-image', () => ({
    toBlob: jest.fn(),
}));

describe('SchedulePage', () => {
    const mockPush = jest.fn();
    const mockReplace = jest.fn();

    const waitForScheduleToLoad = async () => {
        await waitFor(() => {
            expect(screen.getByText('テストイベント')).toBeInTheDocument();
        });
    };

    const getCell = (container: HTMLElement, dateIndex: number, timeIndex: number) => {
        const cell = container.querySelector(
            `[data-date-index="${dateIndex}"][data-time-index="${timeIndex}"]`
        );

        expect(cell).not.toBeNull();
        return cell as HTMLElement;
    };

    const getCalendarContainer = (container: HTMLElement) => {
        const calendarContainer = container.querySelector('.calendar-container');

        expect(calendarContainer).not.toBeNull();
        return calendarContainer as HTMLDivElement;
    };

    const getCalendarGrid = (container: HTMLElement) => {
        const calendarGrid = container.querySelector('.calendar-grid');

        expect(calendarGrid).not.toBeNull();
        return calendarGrid as HTMLDivElement;
    };

    // テスト前の準備
    beforeEach(() => {
        jest.clearAllMocks();
        (toBlob as jest.Mock).mockResolvedValue(new Blob(['calendar'], { type: 'image/png' }));

        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: jest.fn(),
                write: jest.fn().mockResolvedValue(undefined),
            },
        });

        Object.defineProperty(window, 'ClipboardItem', {
            configurable: true,
            writable: true,
            value: jest.fn().mockImplementation((items) => items),
        });

        Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
            configurable: true,
            value: jest.fn().mockResolvedValue(undefined),
        });
        Object.defineProperty(document, 'exitFullscreen', {
            configurable: true,
            value: jest.fn().mockResolvedValue(undefined),
        });
        Object.defineProperty(document, 'fullscreenElement', {
            configurable: true,
            writable: true,
            value: null,
        });

        // useParamsのモック
        (useParams as jest.Mock).mockReturnValue({
            id: 'test-schedule-id',
        });
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
            replace: mockReplace,
        });
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn((key: string) => (key === 'mode' ? 'edit' : null)),
        });
        (useAuth as jest.Mock).mockReturnValue({
            user: {
                uid: 'test-user',
                isAnonymous: true,
            },
            loading: false,
            signInAnonymously: jest.fn(),
        });

        // onSnapshotのモック
        (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
            callback({
                docs: [
                    {
                        id: 'participant1',
                        data: () => ({
                            userId: 'participant1',
                            name: 'テスト参加者1',
                            slots: ['0-0', '0-1'],
                            createdAt: new Date(),
                        }),
                    },
                    {
                        id: 'participant2',
                        data: () => ({
                            userId: 'participant2',
                            name: 'テスト参加者2',
                            slots: ['0-0', '1-0'],
                            createdAt: new Date(),
                        }),
                    },
                ],
            });
            return jest.fn(); // unsubscribe関数
        });

        // getDocのモック
        (getDoc as jest.Mock).mockImplementation(async (ref) => {
            if (ref?.path === 'schedules/test-schedule-id/participants/test-user') {
                return {
                    exists: () => false,
                    data: () => null,
                };
            }

            return {
                exists: () => true,
                data: () => ({
                    name: 'テストイベント',
                    description: 'テスト用の説明',
                    startDate: '2025-05-15',
                    endDate: '2025-05-17',
                    startTime: '09:00',
                    endTime: '17:00',
                    duration: 30,
                    createdAt: {
                        toDate: () => new Date(),
                    },
                }),
            };
        });
    });

    test('スケジュールページが正しくレンダリングされること', async () => {
        const { container } = render(<SchedulePage />);

        // ローディング表示が最初に表示されることを確認
        expect(screen.getByText(/読み込み中/i)).toBeInTheDocument();

        // スケジュールデータが表示されることを確認
        await waitFor(() => {
            expect(screen.getByText('テストイベント')).toBeInTheDocument();
            expect(screen.getByText('テスト用の説明')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.queryByText('テスト参加者1')).not.toBeInTheDocument();
            expect(screen.queryByText('テスト参加者2')).not.toBeInTheDocument();
            expect(screen.queryByText(/参加者一覧/)).not.toBeInTheDocument();
            expect(screen.queryByText(/重なりが大きい候補/)).not.toBeInTheDocument();
        });

        const calendarGrid = getCalendarGrid(container);
        const cornerHeader = container.querySelector('.time-header');
        const dateHeader = container.querySelector('.date-header');
        const timeLabel = container.querySelector('.time-label');

        expect(calendarGrid).toHaveStyle({ overflow: 'visible' });
        expect(calendarGrid).toHaveStyle({
            gridTemplateColumns: 'var(--calendar-time-label-width) repeat(3, var(--calendar-slot-width))',
        });
        expect(cornerHeader).toHaveStyle({ zIndex: '60' });
        expect(dateHeader).toHaveStyle({ zIndex: '50' });
        expect(timeLabel).toHaveStyle({ zIndex: '40' });

        const overlappingCell = getCell(container, 0, 0);
        expect(overlappingCell).not.toHaveTextContent('2');
    });

    test('登録後の閲覧画面では他の参加者の回答が表示されること', async () => {
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn((key: string) => (key === 'mode' ? 'view' : null)),
        });

        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        await waitFor(() => {
            expect(screen.getByText('テスト参加者1')).toBeInTheDocument();
            expect(screen.getByText('テスト参加者2')).toBeInTheDocument();
            expect(screen.getByText(/参加者一覧 \(2\)/)).toBeInTheDocument();
            expect(screen.getByText(/重なりが大きい候補/)).toBeInTheDocument();
            expect(screen.getByLabelText('通常表示')).toBeInTheDocument();
            expect(screen.getByLabelText('全体表示')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '表を全画面表示' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '表を画像コピー' })).toBeInTheDocument();
        });

        const overlappingCell = getCell(container, 0, 0);
        expect(overlappingCell).toHaveTextContent('2');
    });

    test('閲覧画面で全体表示モードに切り替えられること', async () => {
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn((key: string) => (key === 'mode' ? 'view' : null)),
        });

        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        const calendarContainer = getCalendarContainer(container);
        fireEvent.click(screen.getByLabelText('全体表示'));

        await waitFor(() => {
            expect(calendarContainer).toHaveClass('calendar-container-fit');
        });
    });

    test('閲覧画面で表を全画面表示できること', async () => {
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn((key: string) => (key === 'mode' ? 'view' : null)),
        });

        render(<SchedulePage />);

        await waitForScheduleToLoad();

        fireEvent.click(screen.getByRole('button', { name: '表を全画面表示' }));

        await waitFor(() => {
            expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled();
        });
    });

    test('閲覧画面で表全体を画像としてクリップボードにコピーできること', async () => {
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn((key: string) => (key === 'mode' ? 'view' : null)),
        });

        render(<SchedulePage />);

        await waitForScheduleToLoad();

        fireEvent.click(screen.getByRole('button', { name: '表を画像コピー' }));

        await waitFor(() => {
            expect(toBlob).toHaveBeenCalled();
            expect(navigator.clipboard.write).toHaveBeenCalled();
        });
    });

    test('参加情報を登録できること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        // 参加者名を入力
        fireEvent.change(screen.getByLabelText(/お名前/i), {
            target: { value: 'テスト参加者3' },
        });

        const firstCell = getCell(container, 0, 0);
        fireEvent.mouseDown(firstCell);
        fireEvent.mouseUp(window);

        await waitFor(() => {
            expect(firstCell).toHaveClass('selected');
        });

        const submitButton = screen.getByRole('button', { name: /参加情報を登録/i });

        expect(submitButton).toBeEnabled();

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(setDoc).toHaveBeenCalled();
        });

        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                name: 'テスト参加者3',
                slots: ['0-0'],
                userId: 'test-user',
            })
            ,
            { merge: true }
        );
        expect(mockPush).toHaveBeenCalledWith('/schedule/test-schedule-id?mode=view');
    });

    test('なぞり選択モードでも単一セルを選択できること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        fireEvent.click(screen.getByLabelText('なぞり選択'));

        const firstCell = getCell(container, 0, 0);
        fireEvent.mouseDown(firstCell);
        fireEvent.mouseUp(window);

        await waitFor(() => {
            expect(firstCell).toHaveClass('selected');
            expect(screen.getByText(/選択済み時間枠:\s*1/)).toBeInTheDocument();
        });
    });

    test('タッチ操作でも単一セルを選択できること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        const firstCell = getCell(container, 0, 0);

        fireEvent.touchStart(firstCell, {
            touches: [{ identifier: 11, clientX: 40, clientY: 40 }],
            changedTouches: [{ identifier: 11, clientX: 40, clientY: 40 }],
        });
        fireEvent.touchEnd(window, {
            touches: [],
            changedTouches: [{ identifier: 11, clientX: 40, clientY: 40 }],
        });

        await waitFor(() => {
            expect(firstCell).toHaveClass('selected');
            expect(screen.getByText(/選択済み時間枠:\s*1/)).toBeInTheDocument();
        });
    });

    test('タッチのなぞり選択でも複数セルを選択できること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        fireEvent.click(screen.getByLabelText('なぞり選択'));

        const firstCell = getCell(container, 0, 0);
        const secondCell = getCell(container, 1, 0);
        const originalElementFromPoint = (document as Document & {
            elementFromPoint?: (x: number, y: number) => Element | null;
        }).elementFromPoint;
        Object.defineProperty(document, 'elementFromPoint', {
            configurable: true,
            writable: true,
            value: jest.fn(() => secondCell),
        });

        fireEvent.touchStart(firstCell, {
            touches: [{ identifier: 21, clientX: 40, clientY: 40 }],
            changedTouches: [{ identifier: 21, clientX: 40, clientY: 40 }],
        });
        fireEvent.touchMove(window, {
            touches: [{ identifier: 21, clientX: 88, clientY: 40 }],
            changedTouches: [{ identifier: 21, clientX: 88, clientY: 40 }],
        });

        await waitFor(() => {
            expect(firstCell).toHaveClass('selected');
            expect(secondCell).toHaveClass('selected');
        });

        fireEvent.touchEnd(window, {
            touches: [],
            changedTouches: [{ identifier: 21, clientX: 88, clientY: 40 }],
        });

        Object.defineProperty(document, 'elementFromPoint', {
            configurable: true,
            writable: true,
            value: originalElementFromPoint,
        });

        await waitFor(() => {
            expect(screen.getByText(/選択済み時間枠:\s*2/)).toBeInTheDocument();
        });
    });

    test('タッチ選択を表示端まで伸ばすと自動スクロールを開始すること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        const calendarContainer = getCalendarContainer(container);
        const firstCell = getCell(container, 0, 0);
        const originalElementFromPoint = (document as Document & {
            elementFromPoint?: (x: number, y: number) => Element | null;
        }).elementFromPoint;
        const requestAnimationFrameSpy = jest
            .spyOn(window, 'requestAnimationFrame')
            .mockImplementation(() => 1);

        Object.defineProperty(document, 'elementFromPoint', {
            configurable: true,
            writable: true,
            value: jest.fn(() => firstCell),
        });
        Object.defineProperty(calendarContainer, 'getBoundingClientRect', {
            configurable: true,
            value: jest.fn(() => ({
                left: 0,
                top: 0,
                right: 100,
                bottom: 100,
                width: 100,
                height: 100,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            })),
        });

        fireEvent.touchStart(firstCell, {
            touches: [{ identifier: 31, clientX: 50, clientY: 50 }],
            changedTouches: [{ identifier: 31, clientX: 50, clientY: 50 }],
        });
        fireEvent.touchMove(window, {
            touches: [{ identifier: 31, clientX: 96, clientY: 96 }],
            changedTouches: [{ identifier: 31, clientX: 96, clientY: 96 }],
        });

        expect(requestAnimationFrameSpy).toHaveBeenCalled();

        fireEvent.touchEnd(window, {
            touches: [],
            changedTouches: [{ identifier: 31, clientX: 96, clientY: 96 }],
        });

        requestAnimationFrameSpy.mockRestore();
        Object.defineProperty(document, 'elementFromPoint', {
            configurable: true,
            writable: true,
            value: originalElementFromPoint,
        });
    });

    test('予定選択エリア上の2本指スクロールで上下左右に移動できること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        const calendarContainer = getCalendarContainer(container);
        const firstCell = getCell(container, 0, 0);

        Object.defineProperty(calendarContainer, 'scrollLeft', {
            configurable: true,
            writable: true,
            value: 100,
        });
        Object.defineProperty(calendarContainer, 'scrollTop', {
            configurable: true,
            writable: true,
            value: 120,
        });

        fireEvent.touchStart(firstCell, {
            touches: [
                { identifier: 41, clientX: 20, clientY: 20 },
                { identifier: 42, clientX: 40, clientY: 40 },
            ],
            changedTouches: [
                { identifier: 41, clientX: 20, clientY: 20 },
                { identifier: 42, clientX: 40, clientY: 40 },
            ],
        });
        fireEvent.touchMove(calendarContainer, {
            touches: [
                { identifier: 41, clientX: 40, clientY: 30 },
                { identifier: 42, clientX: 60, clientY: 50 },
            ],
            changedTouches: [
                { identifier: 41, clientX: 40, clientY: 30 },
                { identifier: 42, clientX: 60, clientY: 50 },
            ],
        });

        expect(calendarContainer.scrollLeft).toBe(80);
        expect(calendarContainer.scrollTop).toBe(110);
    });

    test('範囲選択は開始マスが未選択なら範囲全体を追加すること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        const selectedCell = getCell(container, 0, 0);
        const unselectedCell = getCell(container, 1, 0);

        fireEvent.mouseDown(selectedCell);
        fireEvent.mouseUp(window);

        await waitFor(() => {
            expect(selectedCell).toHaveClass('selected');
        });

        fireEvent.mouseDown(unselectedCell);
        fireEvent.mouseEnter(selectedCell);

        await waitFor(() => {
            expect(unselectedCell).toHaveClass('selected');
            expect(selectedCell).toHaveClass('selected');
        });

        fireEvent.mouseUp(window);

        await waitFor(() => {
            expect(screen.getByText(/選択済み時間枠:\s*2/)).toBeInTheDocument();
        });
    });

    test('範囲選択は開始マスが選択済みなら範囲内の選択を解除すること', async () => {
        const { container } = render(<SchedulePage />);

        await waitForScheduleToLoad();

        const firstCell = getCell(container, 0, 0);
        const secondCell = getCell(container, 1, 0);

        fireEvent.mouseDown(firstCell);
        fireEvent.mouseUp(window);
        fireEvent.mouseDown(secondCell);
        fireEvent.mouseUp(window);

        await waitFor(() => {
            expect(firstCell).toHaveClass('selected');
            expect(secondCell).toHaveClass('selected');
        });

        fireEvent.mouseDown(firstCell);
        fireEvent.mouseEnter(secondCell);

        await waitFor(() => {
            expect(firstCell).not.toHaveClass('selected');
            expect(secondCell).not.toHaveClass('selected');
        });

        fireEvent.mouseUp(window);

        await waitFor(() => {
            expect(screen.getByText(/選択済み時間枠:\s*0/)).toBeInTheDocument();
        });
    });

    test('エラー時にエラーメッセージが表示されること', async () => {
        // getDocがエラーを投げるようにモック
        (getDoc as jest.Mock).mockRejectedValueOnce(new Error('テストエラー'));

        render(<SchedulePage />);

        // エラーメッセージが表示されることを確認
        await waitFor(() => {
            expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
        });
    });

    test('スケジュールが存在しない場合にエラーメッセージが表示されること', async () => {
        // スケジュールが存在しないようにモック
        (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => false,
            data: () => null,
        });

        render(<SchedulePage />);

        // エラーメッセージが表示されることを確認
        await waitFor(() => {
            expect(screen.getByText(/スケジュールが見つかりませんでした/i)).toBeInTheDocument();
        });
    });
});
