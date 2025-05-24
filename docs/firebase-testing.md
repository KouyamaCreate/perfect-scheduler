# Firebase Emulatorを使用したテスト方法

Perfect Schedulerでは、Firebase Emulatorを使用してローカル環境でFirebaseの機能をテストできます。これにより、実際のFirebaseプロジェクトを使用せずに開発とテストが可能になります。

## Firebase Emulatorのセットアップ

### 1. Firebase CLIのインストール

まだFirebase CLIをインストールしていない場合は、以下のコマンドでインストールします：

```bash
npm install -g firebase-tools
```

### 2. Firebase Emulatorのインストール

以下のコマンドでFirebase Emulatorをインストールします：

```bash
firebase setup:emulators:firestore
```

### 3. firebase.jsonの作成

プロジェクトのルートディレクトリに`firebase.json`ファイルを作成します：

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### 4. Firebaseのセキュリティルールファイルの作成

プロジェクトのルートディレクトリに`firestore.rules`ファイルを作成します：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> **注意**: これはテスト用の設定です。本番環境では適切なセキュリティルールを設定してください。

### 5. Firestoreインデックスファイルの作成

プロジェクトのルートディレクトリに`firestore.indexes.json`ファイルを作成します：

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

## Firebase Emulatorの起動

以下のコマンドでFirebase Emulatorを起動します：

```bash
firebase emulators:start
```

Emulatorが起動すると、以下のURLでEmulator UIにアクセスできます：

- Emulator UI: http://localhost:4000
- Firestore Emulator: http://localhost:8080

## アプリケーションをEmulatorに接続する

Firebase Emulatorを使用するには、`src/lib/firebase.ts`ファイルを修正して、開発環境ではEmulatorに接続するようにします：

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 開発環境の場合、Firebase Emulatorに接続
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## テストでFirebase Emulatorを使用する

Jest環境でFirebase Emulatorを使用するには、テスト用のセットアップファイルを作成します。

`jest.setup.firebase.js`ファイルを作成します：

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// テスト用のFirebase設定
const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-auth-domain',
  projectId: 'test-project-id',
  storageBucket: 'test-storage-bucket',
  messagingSenderId: 'test-sender-id',
  appId: 'test-app-id'
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Firebase Emulatorに接続
connectFirestoreEmulator(db, 'localhost', 8080);
```

そして、`jest.config.js`ファイルを修正して、このセットアップファイルを含めます：

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.setup.firebase.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

## 統合テストの実行

Firebase Emulatorを使用した統合テストを実行するには、以下の手順に従います：

1. Firebase Emulatorを起動します：

```bash
firebase emulators:start
```

2. 別のターミナルでテストを実行します：

```bash
npm test
```

## テストデータのシード

テスト用のデータをFirebase Emulatorに事前に登録するには、シードスクリプトを作成します。

`scripts/seed-firestore.js`ファイルを作成します：

```javascript
const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, setDoc, collection, addDoc } = require('firebase/firestore');

// テスト用のFirebase設定
const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-auth-domain',
  projectId: 'test-project-id',
  storageBucket: 'test-storage-bucket',
  messagingSenderId: 'test-sender-id',
  appId: 'test-app-id'
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firebase Emulatorに接続
connectFirestoreEmulator(db, 'localhost', 8080);

// テストデータの登録
async function seedFirestore() {
  try {
    // テストスケジュールの作成
    const scheduleId = 'test-schedule-id';
    await setDoc(doc(db, 'schedules', scheduleId), {
      name: 'テストイベント',
      description: 'テスト用の説明',
      startDate: '2025-05-15',
      endDate: '2025-05-17',
      startTime: '09:00',
      endTime: '17:00',
      duration: 30,
      createdAt: new Date()
    });
    
    // テスト参加者の作成
    await addDoc(collection(db, 'schedules', scheduleId, 'participants'), {
      name: 'テスト参加者1',
      slots: ['0-0', '0-1'],
      createdAt: new Date()
    });
    
    await addDoc(collection(db, 'schedules', scheduleId, 'participants'), {
      name: 'テスト参加者2',
      slots: ['0-0', '1-0'],
      createdAt: new Date()
    });
    
    console.log('テストデータの登録が完了しました');
  } catch (error) {
    console.error('テストデータの登録中にエラーが発生しました:', error);
  }
}

seedFirestore();
```

このスクリプトを実行するには、以下のコマンドを使用します：

```bash
node scripts/seed-firestore.js
```

## まとめ

Firebase Emulatorを使用することで、以下のメリットがあります：

1. 実際のFirebaseプロジェクトを使用せずにテストできる
2. テストごとにデータをリセットできる
3. オフライン環境でも開発とテストが可能
4. コストを発生させずにテストできる

Firebase Emulatorを活用して、効率的な開発とテストを行いましょう。