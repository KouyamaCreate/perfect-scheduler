# Firebase設定ガイド

このガイドでは、Perfect Schedulerアプリケーションで使用するFirebaseプロジェクトの設定方法と、必要な環境変数の取得方法を詳しく説明します。

## 1. Firebaseプロジェクトの作成

### 1.1. Firebase Consoleにアクセス

[Firebase Console](https://console.firebase.google.com/)にアクセスし、Googleアカウントでログインします。

### 1.2. プロジェクトの作成

1. 「プロジェクトを追加」ボタンをクリックします。
2. プロジェクト名を入力します（例：perfect-scheduler）。
3. Google アナリティクスの設定を選択します（任意）。
   - 「このプロジェクトでGoogle アナリティクスを有効にする」のチェックボックスを必要に応じて設定します。
4. 「続行」をクリックします。
5. Google アナリティクスを有効にした場合は、アナリティクスアカウントを選択または作成します。
6. 「プロジェクトを作成」をクリックします。
7. プロジェクトの作成が完了するまで待ちます。

## 2. Firestoreデータベースの設定

### 2.1. Firestoreの有効化

1. 左側のメニューから「Firestore Database」を選択します。
2. 「データベースの作成」ボタンをクリックします。

### 2.2. セキュリティルールの設定

1. 「テストモードで開始」を選択します。
   - 注意: テストモードでは、誰でもデータベースに読み書きできます。本番環境では適切なセキュリティルールを設定してください。
2. 「次へ」をクリックします。

### 2.3. ロケーションの設定

1. データベースのロケーションを選択します。
   - 日本の場合は「asia-northeast1（東京）」が最適です。
   - ユーザーの多くが日本にいる場合は、このロケーションを選択することでレイテンシを低減できます。
2. 「有効にする」をクリックします。
3. Firestoreデータベースが作成されるまで待ちます。

## 3. Webアプリの登録

### 3.1. アプリの追加

1. プロジェクトの概要ページに移動します。
2. 「</>」（ウェブ）アイコンをクリックして、Webアプリを追加します。

### 3.2. アプリの設定

1. アプリのニックネームを入力します（例：perfect-scheduler-web）。
2. 「このアプリのFirebase Hostingも設定する」のチェックボックスは任意です（今回は不要）。
3. 「アプリを登録」をクリックします。

### 3.3. Firebase SDKの設定情報の取得

以下のような設定情報が表示されます。この情報を環境変数として使用します：

```javascript
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1BCdefGHIjklMNOPqrsTUVwxyz12345",
  authDomain: "perfect-scheduler-12345.firebaseapp.com",
  projectId: "perfect-scheduler-12345",
  storageBucket: "perfect-scheduler-12345.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123def456ghi789jkl"
};
```

この情報をメモするか、スクリーンショットを撮っておきます。

## 4. 環境変数の設定

### 4.1. .env.localファイルの作成

プロジェクトのルートディレクトリに`.env.local`ファイルを作成し、以下の形式で環境変数を設定します：

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA1BCdefGHIjklMNOPqrsTUVwxyz12345
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=perfect-scheduler-12345.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=perfect-scheduler-12345
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=perfect-scheduler-12345.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123def456ghi789jkl
```

### 4.2. 環境変数の対応関係

Firebase設定情報と環境変数の対応関係は以下の通りです：

| Firebase設定       | 環境変数                           |
|--------------------|-----------------------------------|
| apiKey             | NEXT_PUBLIC_FIREBASE_API_KEY      |
| authDomain         | NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  |
| projectId          | NEXT_PUBLIC_FIREBASE_PROJECT_ID   |
| storageBucket      | NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET |
| messagingSenderId  | NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID |
| appId              | NEXT_PUBLIC_FIREBASE_APP_ID       |

## 5. Firebase設定の確認方法

一度設定した後でFirebaseの設定情報を再確認したい場合は、以下の手順で確認できます：

### 5.1. プロジェクト設定へのアクセス

1. Firebase Consoleで対象のプロジェクトを開きます。
2. 左側のメニューから「⚙️」（歯車アイコン）をクリックし、「プロジェクトの設定」を選択します。

### 5.2. アプリ設定の確認

1. 「全般」タブの下部にある「マイアプリ」セクションで、登録したWebアプリを確認します。
2. 「Firebase SDK snippet」の「構成」を選択すると、firebaseConfigオブジェクトが表示されます。
3. この情報を使用して環境変数を設定または更新できます。

## 6. セキュリティに関する注意事項

### 6.1. 環境変数の管理

- `.env.local`ファイルはGitリポジトリにコミットしないでください。
- `.gitignore`ファイルに`.env.local`が含まれていることを確認してください。

### 6.2. 本番環境のセキュリティ

テストモードのセキュリティルールは開発中のみ使用し、本番環境では適切なセキュリティルールを設定してください。

例えば、以下のようなルールを設定することで、認証されたユーザーのみがデータにアクセスできるようになります：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schedules/{scheduleId} {
      allow read: if true;
      allow write: if true;
      
      match /participants/{participantId} {
        allow read: if true;
        allow write: if true;
      }
    }
  }
}
```

## 7. トラブルシューティング

### 7.1. 接続エラー

Firebase接続エラーが発生した場合は、以下を確認してください：

- 環境変数が正しく設定されているか
- Firestoreデータベースが有効になっているか
- プロジェクトのIDが正しいか

### 7.2. CORS エラー

CORS（Cross-Origin Resource Sharing）エラーが発生した場合は、Firebase Authenticationの承認済みドメインにローカル開発サーバーのドメイン（例：localhost）が含まれていることを確認してください。

1. Firebase Consoleで「Authentication」を選択します。
2. 「Sign-in method」タブをクリックします。
3. 「承認済みドメイン」セクションで「ドメインを追加」をクリックします。
4. 「localhost」を追加します。

## 8. Firebase Emulatorの使用

開発中は、実際のFirebaseプロジェクトの代わりにFirebase Emulatorを使用することもできます。詳細は[Firebase Testingガイド](./firebase-testing.md)を参照してください。