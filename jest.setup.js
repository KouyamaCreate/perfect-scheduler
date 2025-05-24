// テスト環境のグローバル設定
import '@testing-library/jest-dom';

// Firebaseのモック
jest.mock('firebase/app', () => {
    return {
        initializeApp: jest.fn().mockReturnValue({
            name: 'mock-app',
        }),
    };
});

jest.mock('firebase/firestore', () => {
    return {
        getFirestore: jest.fn().mockReturnValue({
            type: 'firestore',
        }),
        doc: jest.fn().mockImplementation((db, collection, id) => ({
            id,
            collection,
            path: `${collection}/${id}`,
        })),
        collection: jest.fn().mockImplementation((db, path) => ({
            path,
        })),
        getDoc: jest.fn().mockImplementation(() =>
            Promise.resolve({
                exists: jest.fn().mockReturnValue(true),
                data: jest.fn().mockReturnValue({
                    name: 'テストイベント',
                    description: 'テスト用の説明',
                    startDate: '2025-05-15',
                    endDate: '2025-05-17',
                    startTime: '09:00',
                    endTime: '17:00',
                    duration: 30,
                    createdAt: new Date(),
                }),
            })
        ),
        setDoc: jest.fn().mockResolvedValue({}),
        addDoc: jest.fn().mockResolvedValue({ id: 'mock-doc-id' }),
        onSnapshot: jest.fn().mockImplementation((query, callback) => {
            callback({
                docs: [
                    {
                        id: 'participant1',
                        data: () => ({
                            name: 'テスト参加者1',
                            slots: ['0-0', '0-1'],
                            createdAt: new Date(),
                        }),
                    },
                    {
                        id: 'participant2',
                        data: () => ({
                            name: 'テスト参加者2',
                            slots: ['0-0', '1-0'],
                            createdAt: new Date(),
                        }),
                    },
                ],
            });
            return jest.fn(); // unsubscribe関数
        }),
        query: jest.fn().mockImplementation((collection) => collection),
        orderBy: jest.fn().mockReturnValue({}),
    };
});

// window.matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// IntersectionObserverのモック
global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {
        return null;
    }
    unobserve() {
        return null;
    }
    disconnect() {
        return null;
    }
};

// Fetch APIのモック
global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ok: true,
    })
);