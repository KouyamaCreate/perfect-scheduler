import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateSchedule from '@/app/create/page';
import { setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// next/navigationのモック
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

describe('CreateSchedule', () => {
    // テスト前の準備
    beforeEach(() => {
        // useRouterのモック
        const mockPush = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        });
    });

    test('フォームが正しくレンダリングされること', () => {
        render(<CreateSchedule />);

        // 必要なフォーム要素が存在することを確認
        expect(screen.getByLabelText(/イベント名/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/説明/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/開始日/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/終了日/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/開始時間/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/終了時間/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/時間枠の長さ/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /スケジュールを作成/i })).toBeInTheDocument();
    });

    test('フォーム送信時にFirestoreにデータが保存されること', async () => {
        render(<CreateSchedule />);

        // フォームに値を入力
        fireEvent.change(screen.getByLabelText(/イベント名/i), {
            target: { value: 'テストイベント' },
        });
        fireEvent.change(screen.getByLabelText(/説明/i), {
            target: { value: 'テスト用の説明' },
        });
        fireEvent.change(screen.getByLabelText(/開始日/i), {
            target: { value: '2025-05-15' },
        });
        fireEvent.change(screen.getByLabelText(/終了日/i), {
            target: { value: '2025-05-17' },
        });
        fireEvent.change(screen.getByLabelText(/開始時間/i), {
            target: { value: '09:00' },
        });
        fireEvent.change(screen.getByLabelText(/終了時間/i), {
            target: { value: '17:00' },
        });
        fireEvent.change(screen.getByLabelText(/時間枠の長さ/i), {
            target: { value: '30' },
        });

        // フォームを送信
        fireEvent.click(screen.getByRole('button', { name: /スケジュールを作成/i }));

        // FirestoreのsetDocが呼ばれたことを確認
        await waitFor(() => {
            expect(setDoc).toHaveBeenCalled();
        });

        // 正しいデータで呼ばれたことを確認
        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                name: 'テストイベント',
                description: 'テスト用の説明',
                startDate: '2025-05-15',
                endDate: '2025-05-17',
                startTime: '09:00',
                endTime: '17:00',
                duration: 30,
            })
        );

        // ルーターのpushが呼ばれたことを確認
        const { push } = useRouter();
        expect(push).toHaveBeenCalled();
        expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/schedule\/.+$/));
    });

    test('エラー発生時にアラートが表示されること', async () => {
        // setDocがエラーを投げるようにモック
        (setDoc as jest.Mock).mockRejectedValueOnce(new Error('テストエラー'));

        // windowのalertをモック
        const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => { });

        render(<CreateSchedule />);

        // フォームに最低限の値を入力
        fireEvent.change(screen.getByLabelText(/イベント名/i), {
            target: { value: 'テストイベント' },
        });
        fireEvent.change(screen.getByLabelText(/開始日/i), {
            target: { value: '2025-05-15' },
        });
        fireEvent.change(screen.getByLabelText(/終了日/i), {
            target: { value: '2025-05-17' },
        });

        // フォームを送信
        fireEvent.click(screen.getByRole('button', { name: /スケジュールを作成/i }));

        // エラーアラートが表示されることを確認
        await waitFor(() => {
            expect(alertMock).toHaveBeenCalled();
            expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('エラー'));
        });

        // モックをリストア
        alertMock.mockRestore();
    });
});