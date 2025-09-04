# Firebase Authentication トラブルシューティング

## 🚨 "Missing or insufficient permissions" エラーの解決方法

このエラーは主にFirebaseの設定問題です。以下の順序で確認・修正してください。

## 1. Firebase Console での設定確認

### 1.1 Authentication設定
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. **Authentication** → **Sign-in method** で以下を確認：
   - ✅ **匿名** が有効になっている
   - ✅ **Google** が有効になっている
   - ✅ 承認済みドメインに `localhost` が含まれている

### 1.2 Firestoreセキュリティルール
1. **Firestore Database** → **ルール** タブをクリック
2. 現在のルールを確認

#### 開発時（一時的）の推奨ルール：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 開発用 - 認証済みユーザーのみアクセス可能
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### 本番用の推奨ルール：
プロジェクトルートの `firestore.rules` ファイルを参照してください。

## 2. ローカル環境での確認

### 2.1 環境変数の確認
`.env.local` ファイルが正しく設定されていることを確認：

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 2.2 認証状態の確認
開発環境では画面右下に認証デバッグ情報が表示されます：
- Loading: 認証状態を読み込み中
- User: ユーザーがログインしているか
- Anonymous: 匿名ユーザーかどうか

## 3. 段階的な問題解決

### ステップ1: 最も緩いルールでテスト
一時的に以下のルールを適用してテスト：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 全許可（開発時のみ）
    }
  }
}
```

### ステップ2: 認証必須ルールでテスト
認証が動作することを確認したら：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### ステップ3: 本格的なルールを適用
最後に本番用のルールを適用します。

## 4. よくある問題と解決策

### 問題1: 匿名ログインが失敗する
**原因**: 匿名認証が無効
**解決**: Firebase Console で匿名認証を有効にする

### 問題2: Googleログインが失敗する
**原因**: Google認証の設定不備
**解決**: 
1. Google認証を有効にする
2. サポートメールアドレスを設定
3. 承認済みドメインを確認

### 問題3: 認証は成功するがFirestoreアクセスが失敗
**原因**: セキュリティルールが厳しすぎる
**解決**: ルールを段階的に緩くして問題を特定

### 問題4: 環境変数が読み込まれない
**原因**: 
- `.env.local` ファイルが存在しない
- 変数名が間違っている（`NEXT_PUBLIC_` プレフィックス必須）

**解決**: 
1. `.env.local` ファイルを作成
2. すべての変数名に `NEXT_PUBLIC_` プレフィックスを付ける
3. サーバーを再起動

## 5. デバッグのためのコマンド

### Firebase設定の確認
```bash
# 環境変数の確認
cat .env.local

# Next.jsの起動（環境変数込み）
npm run dev
```

### ブラウザでの確認
1. 開発者ツールを開く（F12）
2. Console タブで認証状態を確認
3. Network タブでFirebaseへのリクエストを確認

## 6. 緊急時の対応

もしすべて失敗する場合：

1. **新しいFirebaseプロジェクトを作成**
2. **最初からAuthentication設定をやり直す**
3. **最も緩いセキュリティルールから開始**

## 7. 連絡先

問題が解決しない場合は、以下の情報と共にお知らせください：
- エラーメッセージの全文
- ブラウザの開発者ツールのConsoleに表示されるエラー
- 認証デバッグ情報のスクリーンショット
- 現在のFirestoreセキュリティルール