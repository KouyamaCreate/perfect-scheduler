import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Firebaseの初期化をテスト
describe('Firebase設定', () => {
    // 環境変数のモック
    beforeEach(() => {
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project-id';
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-storage-bucket';
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'test-sender-id';
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';
    });

    // テスト後に環境変数をクリア
    afterEach(() => {
        delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    });

    test('Firebaseが正しく初期化されていること', () => {
        // モックが呼ばれたことを確認
        expect(initializeApp).toHaveBeenCalled();

        // 正しい設定で呼ばれたことを確認
        expect(initializeApp).toHaveBeenCalledWith({
            apiKey: 'test-api-key',
            authDomain: 'test-auth-domain',
            projectId: 'test-project-id',
            storageBucket: 'test-storage-bucket',
            messagingSenderId: 'test-sender-id',
            appId: 'test-app-id'
        });
    });

    test('Firestoreが正しく初期化されていること', () => {
        // モックが呼ばれたことを確認
        expect(getFirestore).toHaveBeenCalled();

        // dbがエクスポートされていることを確認
        expect(db).toBeDefined();
    });
});