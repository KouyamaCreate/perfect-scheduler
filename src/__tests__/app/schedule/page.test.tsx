import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    // テスト前の準備
    beforeEach(() => {
        jest.clearAllMocks();

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
        });

        const overlappingCell = getCell(container, 0, 0);
        expect(overlappingCell).toHaveTextContent('2');
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
