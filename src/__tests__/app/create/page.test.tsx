import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import CreateSchedule from '@/app/create/page';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/components/AppHeader', () => ({
    AppHeader: () => <div>AppHeader</div>,
}));

jest.mock('@/components/InlineCalendar', () => ({
    InlineCalendar: ({ ariaLabel }: { ariaLabel: string }) => <div>{ariaLabel}</div>,
}));

describe('CreateSchedule', () => {
    const mockPush = jest.fn();
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => { });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (useAuth as jest.Mock).mockReturnValue({
            user: {
                uid: 'existing-user',
                getIdToken: jest.fn().mockResolvedValue('existing-token'),
            },
            loading: false,
            signInAnonymously: jest.fn(),
        });
    });

    afterAll(() => {
        mockAlert.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    const fillRequiredFields = () => {
        fireEvent.change(screen.getByLabelText(/イベント名/i), {
            target: { value: 'テストイベント' },
        });
        fireEvent.change(screen.getByLabelText(/開始日/i), {
            target: { value: '2025-05-15' },
        });
        fireEvent.change(screen.getByLabelText(/終了日/i), {
            target: { value: '2025-05-17' },
        });
    };

    test('フォームが正しくレンダリングされること', () => {
        render(<CreateSchedule />);

        expect(screen.getByLabelText(/イベント名/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/説明/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/開始日/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/終了日/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /スケジュールを作成/i })).toBeInTheDocument();
    });

    test('既存ユーザーでフォーム送信時にFirestoreへ保存して遷移すること', async () => {
        render(<CreateSchedule />);

        fillRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /スケジュールを作成/i }));

        await waitFor(() => {
            expect(setDoc).toHaveBeenCalled();
        });

        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                name: 'テストイベント',
                startDate: '2025-05-15',
                endDate: '2025-05-17',
                creatorId: 'existing-user',
            })
        );
        expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/schedule\/.+$/));
    });

    test('未認証なら匿名ログイン後のユーザーで保存すること', async () => {
        const anonymousUser = {
            uid: 'anonymous-user',
            getIdToken: jest.fn().mockResolvedValue('anonymous-token'),
        };
        const signInAnonymously = jest.fn().mockResolvedValue(anonymousUser);

        (useAuth as jest.Mock).mockReturnValue({
            user: null,
            loading: false,
            signInAnonymously,
        });

        render(<CreateSchedule />);

        fillRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /スケジュールを作成/i }));

        await waitFor(() => {
            expect(signInAnonymously).toHaveBeenCalled();
            expect(setDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    creatorId: 'anonymous-user',
                })
            );
        });
    });

    test('保存エラー時にアラートが表示されること', async () => {
        (setDoc as jest.Mock).mockRejectedValueOnce(new Error('テストエラー'));

        render(<CreateSchedule />);

        fillRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /スケジュールを作成/i }));

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('エラー'));
        });
    });
});
