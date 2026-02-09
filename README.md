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

```bash
# Conference Authentication (Server-side only)
CONFERENCE_DEMO_CONF_PASSWORD=password123

# Google Sheets
NEXT_PUBLIC_DEMO_SPREADSHEET_ID=your-spreadsheet-id

# Development Auto-Login (Optional, for local development only)
NEXT_PUBLIC_DEV_AUTO_LOGIN=true
NEXT_PUBLIC_DEV_CONFERENCE_ID=demo-conf
NEXT_PUBLIC_DEV_PASSWORD=password123
NEXT_PUBLIC_DEV_STAFF_NAME=DevUser
```

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

- パスワードは環境変数で管理（ソースコードにハードコード禁止）
- Cookie は httpOnly, secure (本番), sameSite フラグで保護
- 本番環境では HTTPS 必須

## 技術スタック

- **フレームワーク:** Next.js 16 (App Router)
- **言語:** TypeScript 5
- **UI:** React 19, Tailwind CSS, Lucide React
- **バックエンド:** Next.js API Routes
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

## ライセンス

MIT
