# VOXNTRY

カンファレンス受付管理システム - 音声入力とOCR機能を備えた効率的な参加者チェックインツール

## 機能

- 参加者チェックイン/チェックアウト管理
- 音声入力による検索
- 名刺OCR機能
- Google Sheets連携
- リアルタイム参加者ステータス更新

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd voxntry
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` を `.env.local` にコピーして、必要な値を設定します：

```bash
cp .env.example .env.local
```

`.env.local` を編集：

#### JWT Secret の生成

**必須**: JWT認証用の秘密鍵を生成します（最低32文字）：

```bash
# macOS/Linux
openssl rand -base64 32

# または Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### パスワード設定

**開発環境**: プレーンテキストパスワードでOK
**本番環境**: bcryptハッシュが**必須**

```bash
# 本番環境用のハッシュ生成
npm run hash-password "yourSecurePassword"
```

#### .env.local の設定例

**開発環境:**
```bash
# JWT Secret (REQUIRED)
JWT_SECRET=dev-secret-key-minimum-32-characters

# Conference Authentication - Plain-text for development
CONFERENCE_DEMO_CONF_PASSWORD=devpassword123

# Google Sheets (REQUIRED)
NEXT_PUBLIC_DEMO_SPREADSHEET_ID=your-spreadsheet-id

# Development Auto-Login (Optional)
NEXT_PUBLIC_DEV_AUTO_LOGIN=true
NEXT_PUBLIC_DEV_CONFERENCE_ID=demo-conf
NEXT_PUBLIC_DEV_PASSWORD=devpassword123
NEXT_PUBLIC_DEV_STAFF_NAME=DevUser
```

**本番環境:**
```bash
# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here-minimum-32-chars

# Conference Authentication - bcrypt hash REQUIRED
CONFERENCE_DEMO_CONF_PASSWORD=$2b$12$...generatedHashHere...

# Google Sheets
NEXT_PUBLIC_DEMO_SPREADSHEET_ID=your-spreadsheet-id

# Development Auto-Login (Disabled in production)
NEXT_PUBLIC_DEV_AUTO_LOGIN=false
```

**セキュリティ注意事項**:
- 🔴 **本番環境では必ずbcryptハッシュを使用**してください
- 開発環境ではプレーンテキストでも可（利便性優先）
- `.env.local` ファイルは絶対にgitにコミットしないでください
- 開発環境の自動ログイン機能は本番環境では無効になります

### 4. Google認証の設定

**ローカル開発:**
1. [Google Cloud Console](https://console.cloud.google.com/)でサービスアカウントを作成
2. Google Sheets APIを有効化
3. サービスアカウントキー（JSON）をダウンロード
4. プロジェクトルートに配置（例: `service-account-key.json`）
5. 環境変数を設定:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

**GCP Cloud Run:**
- Managed Identityが自動的に使用されます（追加設定不要）

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 開発環境の特徴

### 自動ログイン

開発環境では、`.env.local` で `NEXT_PUBLIC_DEV_AUTO_LOGIN=true` を設定すると、アプリ起動時に自動的にログインします。手動でログイン情報を入力する手間が省けます。

無効にする場合は、`.env.local` で以下を設定：

```bash
NEXT_PUBLIC_DEV_AUTO_LOGIN=false
```

## 本番環境へのデプロイ

### GCP Cloud Runへのデプロイ

1. **環境変数の設定:**

```bash
gcloud run services update voxntry \
  --set-env-vars "CONFERENCE_DEMO_CONF_PASSWORD=<secure-password>" \
  --set-env-vars "NEXT_PUBLIC_DEMO_SPREADSHEET_ID=<your-spreadsheet-id>" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "GCP_PROJECT_ID=<your-project-id>"
```

2. **（推奨）GCP Secret Managerの使用:**

```bash
# Secretの作成
echo -n "secure-password" | gcloud secrets create demo-conf-password --data-file=-

# Cloud RunにSecretをマウント
gcloud run services update voxntry \
  --update-secrets "CONFERENCE_DEMO_CONF_PASSWORD=demo-conf-password:latest"
```

## セキュリティ

### JWT認証
- **署名付きトークン**: HMAC-SHA256によるトークン署名で改ざん防止
- **ステートレス認証**: サーバー側のセッションストレージ不要
- **自動有効期限**: トークンは24時間で自動失効
- **Middleware保護**: 全API保護エンドポイントで自動検証

### 入力バリデーション
- **Zodスキーマ**: 型安全なリクエストボディ検証
- **自動型推論**: TypeScript型がスキーマから自動生成
- **詳細なエラーメッセージ**: フィールド単位のバリデーションエラー
- **ファイルサイズ制限**: 画像10MB、音声50MBまで
- **ファイル形式検証**: MIME typeによる形式チェック

### Rate Limiting（レート制限）
- **ブルートフォース攻撃防止**: ログインAPIは1分間に5回まで
- **IPアドレスベース**: クライアントIP単位で制限
- **LRUキャッシュ**: メモリ効率的な実装
- **自動リセット**: 1分後に制限解除
- **429エラー**: 制限超過時に適切なHTTPステータス返却

### 認証とパスワード管理
- **パスワードハッシュ化**: bcrypt (salt rounds: 12) を使用
- **環境変数管理**: パスワードとJWT秘密鍵は環境変数で管理
- **ハッシュ生成**: `npm run hash-password "yourPassword"` でbcryptハッシュを生成
- **JWT Secret**: 最低32文字のランダム文字列（`openssl rand -base64 32`で生成）

### Cookie セキュリティ
- `httpOnly`: JavaScript からのアクセスを防止（XSS保護）
- `secure`: 本番環境でHTTPSのみ送信
- `sameSite: strict`: CSRF攻撃からの保護
- JWT トークンをhttpOnly Cookieで安全に保存

### CSRF保護（New!）
- **Double Submit Cookie Pattern**: CSRFトークンによる二重検証
- **Origin/Referer検証**: クロスオリジンリクエストのブロック
- **Defense in Depth**: 多層防御戦略による包括的な保護
- **自動適用**: 全ての状態変更操作（POST/PUT/DELETE/PATCH）を自動保護
- **ユーザー影響ゼロ**: 透過的な実装でUXへの影響なし
- 詳細は [docs/CSRF_PROTECTION.md](docs/CSRF_PROTECTION.md) を参照

### 本番環境要件
- HTTPS 必須
- GCP Secret Manager推奨（環境変数の代わりに）
- 強力なパスワード使用（最低12文字以上）

### セキュリティポリシー
詳細は [SECURITY.md](SECURITY.md) を参照してください。

## 技術スタック

- **フレームワーク:** Next.js 16 (App Router)
- **言語:** TypeScript 5
- **UI:** React 19, Tailwind CSS, Lucide React
- **バックエンド:** Next.js API Routes
- **バリデーション:** Zod（型安全なスキーマ検証）
- **認証:** JWT (jose) + bcrypt
- **Google連携:** googleapis (Google Sheets API)

## ディレクトリ構成

```
voxntry/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   ├── dashboard/      # ダッシュボードページ
│   │   └── page.tsx        # ログインページ
│   ├── config/             # 設定ファイル
│   │   └── conferences.ts  # カンファレンス設定
│   ├── lib/                # ユーティリティ
│   │   ├── google.ts       # Google認証
│   │   └── google-sheets.ts # Google Sheets操作
│   └── types/              # TypeScript型定義
├── .env.example            # 環境変数テンプレート
├── .env.local              # ローカル環境変数（gitignore）
└── package.json
```

## コントリビューション

コントリビューションを歓迎します！プルリクエストを送る前に、[CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。

## 行動規範

このプロジェクトは [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md) を採用しています。参加することで、この行動規範を遵守することに同意したものとみなされます。

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。
