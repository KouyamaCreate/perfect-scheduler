# CLAUDE.md - Perfect Scheduler

## プロジェクト概要

Perfect Schedulerは、スケジュール調整を簡単に、美しく行うためのNext.jsベースのウェブアプリケーションです。

## 技術スタック

- **フロントエンド**: Next.js 15.3.2, React 19, TypeScript, TailwindCSS 4
- **バックエンド**: Firebase Firestore, Firebase Authentication
- **認証**: 匿名ログイン・Googleログイン対応
- **テスト**: Jest, Testing Library
- **リンター**: ESLint

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リンターチェック
npm run lint

# テスト実行
npm test

# テスト（監視モード）
npm run test:watch

# テストカバレッジ
npm run test:coverage
```

## プロジェクト構造

```
src/
├── app/                     # Next.js App Router
│   ├── create/             # スケジュール作成ページ
│   ├── schedule/           # スケジュール表示・編集
│   │   ├── [id]/          # 個別スケジュールページ
│   │   └── demo/          # デモページ
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx          # ホームページ
├── lib/
│   ├── firebase.ts       # Firebase設定
│   └── auth.ts          # Firebase Authentication設定
├── contexts/
│   └── AuthContext.tsx  # 認証状態管理
├── components/
│   ├── LoginModal.tsx   # ログインモーダル
│   └── AuthHeader.tsx   # 認証ヘッダー
└── __tests__/           # テストファイル
```

## 環境変数

`.env.local`ファイルに以下の環境変数を設定：

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 主要機能

- 複数日程のスケジュール調整
- ユニークなURLによる共有
- リアルタイムでの参加者情報の更新
- 参加者数に応じたビジュアル表示（上位5人までのグラデーション表示）
- カラーカスタマイズ機能
- タッチデバイス対応（最近の更新で改善されたタッチイベントハンドリング）
- **認証機能**: 匿名ログイン・Googleログイン対応
- **セキュリティ**: Firebase Authenticationによる認証済みユーザーのみアクセス可能

## 最近の変更

- **認証機能の追加**: 匿名ログイン・Googleログイン対応
- **セキュリティ強化**: Firebase Authenticationによる認証必須化
- **自動ログイン**: 未認証ユーザーは自動的に匿名ログインを実行
- **ユーザー体験向上**: ログイン済みユーザーは自動的に名前が設定される
- タッチデバイスでの時間枠選択機能の強化
- モバイル選択モードの追加
- シングルタッチ対応とスクロール防止機能

## テスト

テストファイルは`src/__tests__/`ディレクトリにあります：
- `app/create/page.test.tsx` - スケジュール作成ページのテスト
- `app/schedule/page.test.tsx` - スケジュール表示ページのテスト
- `lib/firebase.test.ts` - Firebase機能のテスト

## ドキュメント

- `docs/firebase-setup-guide.md` - Firebase設定ガイド
- `docs/firebase-testing.md` - Firebaseテスト方法

## 開発時の注意点

- TypeScriptの型チェックを必ず通すこと
- ESLintのルールに従うこと
- テストを書いて品質を保つこと
- Firebase接続が必要なためローカル開発には環境変数設定が必須
- **認証設定**: Firebase Console で Authentication（匿名・Google）を有効にすること
- **セキュリティルール**: プロダクション環境では`firestore.rules`を適用すること
- **認証状態**: useAuthフックを使用してユーザー認証状態を適切に管理すること