# ローカル開発環境でのFirebase Authentication問題

## 🚨 ローカル開発でよくある問題

### 1. Googleログインの制約
Googleログインはローカル開発環境（`localhost`）では以下の制約があります：

#### 問題
- **404エラー**: OAuth設定が不完全
- **ポップアップブロック**: ブラウザがポップアップを許可していない
- **ドメイン制限**: Firebase ConsoleでのOAuth設定の問題

#### 解決策
1. **Firebase Console設定確認**:
   - Authentication → Sign-in method → Google → 設定
   - 承認済みドメインに `localhost` が含まれているか確認
   - Web SDK設定でOAuth リダイレクトURIが正しく設定されているか

2. **開発用の簡易設定**:
   ```
   承認済みドメイン: 
   - localhost
   - 127.0.0.1
   - あなたの本番ドメイン
   ```

### 2. 匿名ログインの推奨
ローカル開発では **匿名ログイン** の使用を強く推奨します：

#### 理由
- ✅ 設定が簡単
- ✅ ローカル環境での制約がない
- ✅ 即座にテスト可能
- ✅ Firestore権限テストに最適

#### 設定方法
Firebase Console → Authentication → Sign-in method → 匿名 → 有効化

### 3. 開発環境での推奨フロー

#### ステップ1: 匿名ログインでテスト
```bash
npm run dev
# ブラウザでlocalhost:3000にアクセス
# 匿名ログインが自動実行されることを確認
```

#### ステップ2: Firebase設定確認
- 画面右下の認証デバッグ情報を確認
- User: ✅ が表示されることを確認
- Anonymous: ✅ が表示されることを確認

#### ステップ3: Firestoreアクセステスト
- スケジュール作成・参加が動作することを確認
- エラーが出る場合はFirestoreルールを確認

#### ステップ4: Googleログインは本番環境でテスト
- Vercelなどにデプロイしてからテスト
- または確実にOAuth設定を完了してからローカルでテスト

### 4. 環境別の推奨認証方法

| 環境 | 匿名ログイン | Googleログイン | 推奨度 |
|------|-------------|---------------|--------|
| ローカル開発 | ✅ | ⚠️ 制約あり | 匿名推奨 |
| デプロイ済み | ✅ | ✅ | Google推奨 |
| テスト環境 | ✅ | ✅ | 両方対応 |

### 5. よくあるエラーと解決策

#### エラー1: "auth/configuration-not-found"
**原因**: Firebase Authentication設定が不完全
**解決**: Firebase ConsoleでGoogle認証を正しく設定

#### エラー2: "auth/unauthorized-domain"
**原因**: localhost が承認済みドメインに含まれていない
**解決**: Firebase Console → Authentication → Sign-in method → 承認済みドメイン に localhost を追加

#### エラー3: ポップアップが404エラー
**原因**: OAuth設定のリダイレクトURIが正しくない
**解決**: Firebase ConsoleでOAuth設定を確認

### 6. 開発時の推奨設定

#### .env.local の確認
```bash
# すべての環境変数が設定されているか確認
cat .env.local

# 特に重要な項目
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

#### 開発用Firestoreルール
```javascript
// 開発時は緩いルールを使用
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;  // 認証済みならOK
    }
  }
}
```

### 7. 推奨開発フロー

1. **最初に匿名ログインでアプリ全体をテスト**
2. **Firestoreの読み書きが正常に動作することを確認**
3. **Googleログインは本番環境（Vercel等）でテスト**
4. **問題があれば段階的にデバッグ**

### 8. 緊急対応

もしローカルでどうしても動かない場合：

```bash
# 1. Vercelに一時デプロイ
npm run build
# Vercelにデプロイしてテスト

# 2. または Firebase Hosting でテスト
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

本番環境では Googleログインも正常に動作するはずです。