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

**重要**: パスワードはbcryptハッシュを使用してください。以下のコマンドでハッシュを生成できます：

```bash
npm run hash-password "yourSecurePassword"
```

生成されたハッシュを `.env.local` に設定：

```bash
# Conference Authentication (Server-side only)
# REQUIRED: Use bcrypt hash (generate with: npm run hash-password "yourPassword")
CONFERENCE_DEMO_CONF_PASSWORD=$2b$12$...generatedHashHere...

# Google Sheets
# REQUIRED: Your spreadsheet ID from Google Sheets URL
NEXT_PUBLIC_DEMO_SPREADSHEET_ID=your-spreadsheet-id

# Development Auto-Login (Optional, for local development only)
NEXT_PUBLIC_DEV_AUTO_LOGIN=true
NEXT_PUBLIC_DEV_CONFERENCE_ID=demo-conf
NEXT_PUBLIC_DEV_PASSWORD=yourPlainTextPasswordForDevOnly
NEXT_PUBLIC_DEV_STAFF_NAME=DevUser
```

**セキュリティ注意事項**:
- 本番環境では必ずbcryptハッシュを使用してください
- `.env.local` ファイルは絶対にgitにコミットしないでください（`.gitignore`に含まれています）
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

### 認証とパスワード管理
- **パスワードハッシュ化**: bcrypt (salt rounds: 12) を使用
- **環境変数管理**: パスワードは環境変数で管理（ソースコードにハードコード禁止）
- **ハッシュ生成**: `npm run hash-password "yourPassword"` でbcryptハッシュを生成

### Cookie セキュリティ
- `httpOnly`: XSS攻撃からの保護
- `secure`: 本番環境でHTTPSのみ送信
- `sameSite: strict`: CSRF攻撃からの保護

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
