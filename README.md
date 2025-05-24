# Perfect Scheduler

スケジュール調整を簡単に、美しく行うためのウェブアプリケーション。

## 機能

- 複数日程のスケジュール調整
- ユニークなURLによる共有
- リアルタイムでの参加者情報の更新
- 参加者数に応じたビジュアル表示（上位5人までのグラデーション表示）
- カラーカスタマイズ機能

## 技術スタック

- **フロントエンド**: Next.js, React, TypeScript, TailwindCSS
- **バックエンド**: Firebase Firestore
- **デプロイ**: Vercel

## セットアップ手順

### 前提条件

- Node.js 18.x以上
- npm 9.x以上
- Firebaseアカウント
- Vercelアカウント（デプロイ用）

### ローカル開発環境のセットアップ

1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/perfect-scheduler.git
cd perfect-scheduler
```

2. 依存パッケージのインストール

```bash
npm install
```

3. Firebaseプロジェクトの作成

- [Firebase Console](https://console.firebase.google.com/)にアクセス
- 「プロジェクトを追加」をクリック
- プロジェクト名を入力（例：perfect-scheduler）
- Google アナリティクスの設定（任意）
- 「プロジェクトを作成」をクリック

4. Firestoreデータベースの設定

- 作成したプロジェクトの「Firestore Database」を選択
- 「データベースの作成」をクリック
- 「テストモードで開始」を選択（本番環境では適切なセキュリティルールを設定してください）
- リージョンを選択（例：asia-northeast1）
- 「有効にする」をクリック

5. Firebaseアプリの登録

- プロジェクトの概要ページで「</>」（ウェブ）アイコンをクリック
- アプリのニックネームを入力（例：perfect-scheduler-web）
- 「アプリを登録」をクリック
- 表示されるFirebaseの設定情報をメモ

6. 環境変数の設定

- `.env.local.example`ファイルを`.env.local`にコピー
- Firebaseの設定情報を`.env.local`ファイルに記入

```bash
cp .env.local.example .env.local
```

7. 開発サーバーの起動

```bash
npm run dev
```

8. ブラウザで[http://localhost:3000](http://localhost:3000)にアクセス

## デプロイ手順

### Vercelへのデプロイ

1. GitHubにプロジェクトをプッシュ

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Vercelアカウントの作成

- [Vercel](https://vercel.com/)にアクセス
- GitHubアカウントでサインアップ/ログイン

3. プロジェクトのインポート

- 「New Project」をクリック
- GitHubリポジトリからプロジェクトを選択
- 「Import」をクリック

4. 環境変数の設定

- 「Environment Variables」セクションで、`.env.local`ファイルと同じ環境変数を設定
- 各環境変数の名前と値を入力

5. デプロイの実行

- 「Deploy」をクリック
- デプロイが完了するまで待機
- デプロイが完了すると、プロジェクトのURLが表示されます

## 使用方法

1. スケジュールの作成
   - トップページから「新規作成」ボタンをクリック
   - イベント名、説明、日程、時間枠を入力
   - 「スケジュールを作成」ボタンをクリック

2. スケジュールの共有
   - 生成されたURLをコピー
   - 参加者に共有

3. 参加情報の登録
   - 参加者は共有されたURLにアクセス
   - 名前を入力
   - 参加可能な時間枠を選択
   - 「参加情報を登録」ボタンをクリック

4. 最適な日程の決定
   - 参加者の登録状況をリアルタイムで確認
   - 最も参加者が多い時間枠を選択

## テスト方法

アプリケーションのテストは以下のコマンドで実行できます：

```bash
# すべてのテストを実行
npm test

# ファイルの変更を監視しながらテストを実行
npm run test:watch

# テストカバレッジレポートを生成
npm run test:coverage
```

> **詳細な手順**: Firebase連携のテスト方法については[docs/firebase-testing.md](docs/firebase-testing.md)を参照してください。

## ライセンス

MIT

## 作者

Your Name

## 環境変数の設定方法

Perfect Schedulerを動作させるためには、Firebaseプロジェクトの設定情報を環境変数として設定する必要があります。以下の手順に従って設定してください。

> **詳細な手順**: より詳細なFirebase設定ガイドは[docs/firebase-setup-guide.md](docs/firebase-setup-guide.md)を参照してください。

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセスします
2. 「プロジェクトを追加」をクリックします
3. プロジェクト名を入力します（例：perfect-scheduler）
4. Google アナリティクスの設定（任意）を行います
5. 「プロジェクトを作成」をクリックします

### 2. Firestoreデータベースの設定

1. 作成したプロジェクトの「Firestore Database」を選択します
2. 「データベースの作成」をクリックします
3. 「テストモードで開始」を選択します（本番環境では適切なセキュリティルールを設定してください）
4. リージョンを選択します（例：asia-northeast1）
5. 「有効にする」をクリックします

### 3. Firebaseアプリの登録

1. プロジェクトの概要ページで「</>」（ウェブ）アイコンをクリックします
2. アプリのニックネームを入力します（例：perfect-scheduler-web）
3. 「アプリを登録」をクリックします
4. 表示されるFirebaseの設定情報をメモします

### 4. 環境変数ファイルの作成

1. プロジェクトのルートディレクトリに`.env.local`ファイルを作成します
2. 以下の形式で環境変数を設定します：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

3. Firebaseの設定情報から各値を取得する方法：
   - **API Key**: `apiKey`の値
   - **Auth Domain**: `authDomain`の値
   - **Project ID**: `projectId`の値
   - **Storage Bucket**: `storageBucket`の値
   - **Messaging Sender ID**: `messagingSenderId`の値
   - **App ID**: `appId`の値

### 5. 環境変数の確認

環境変数が正しく設定されているか確認するには、アプリケーションを起動して動作を確認します：

```bash
npm run dev
```

ブラウザで[http://localhost:3000](http://localhost:3000)にアクセスし、スケジュールの作成と表示が正常に動作することを確認します。

### 6. Vercelへのデプロイ時の環境変数設定

Vercelにデプロイする場合は、Vercelのプロジェクト設定で環境変数を設定します：

1. Vercelダッシュボードでプロジェクトを選択します
2. 「Settings」タブをクリックします
3. 「Environment Variables」セクションで、`.env.local`ファイルと同じ環境変数を設定します
4. 「Save」をクリックして設定を保存します
5. プロジェクトを再デプロイして変更を適用します

### トラブルシューティング

環境変数に関する一般的な問題と解決策：

1. **環境変数が読み込まれない**
   - `.env.local`ファイルがプロジェクトのルートディレクトリにあることを確認してください
   - 環境変数名が正確に`NEXT_PUBLIC_`で始まっていることを確認してください

2. **Firebaseへの接続エラー**
   - Firebaseプロジェクトが正しく設定されていることを確認してください
   - Firestoreデータベースが有効になっていることを確認してください
   - 環境変数の値が正確にコピーされていることを確認してください

3. **CORS エラー**
   - Firebaseプロジェクトの設定でドメインが許可されていることを確認してください
