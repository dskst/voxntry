# VOXNTRY

カンファレンス受付管理システム - 効率的な参加者チェックインツール

## 機能

- 参加者チェックイン/チェックアウト管理
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

### 3. カンファレンス設定

カンファレンス設定を行います：

```bash
# サンプル設定ファイルをコピー
cp config/conferences.example.json config/conferences.json

# エディタで開いて、カンファレンス情報を編集
# プレースホルダーの値を実際の設定に置き換えてください
```

**重要**: `config/conferences.json` ファイルはカンファレンス固有の設定を含むため、Gitで管理されません。

### 4. 環境変数の設定

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
# JWT Secret (必須)
JWT_SECRET=dev-secret-key-minimum-32-characters

# カンファレンスパスワード（conferences.jsonのpasswordEnvVarと一致させる）
CONFERENCE_YOUR_CONF_PASSWORD=devpassword123

# 開発環境の自動ログイン（オプション）
NEXT_PUBLIC_DEV_AUTO_LOGIN=true
NEXT_PUBLIC_DEV_CONFERENCE_ID=your-conference-id
NEXT_PUBLIC_DEV_PASSWORD=devpassword123
NEXT_PUBLIC_DEV_STAFF_NAME=DevUser
```

**本番環境:**
```bash
# JWT Secret (openssl rand -base64 32 で生成)
JWT_SECRET=your-generated-secret-here-minimum-32-chars

# カンファレンスパスワード - bcryptハッシュが必須
CONFERENCE_YOUR_CONF_PASSWORD=$2b$12$...generatedHashHere...

# 開発環境の自動ログイン（本番では無効）
NEXT_PUBLIC_DEV_AUTO_LOGIN=false
```

**注意**: `config/conferences.json` の `passwordEnvVar` フィールドは、ここで設定する環境変数名と一致させる必要があります。

**セキュリティ注意事項**:
- 🔴 **本番環境では必ずbcryptハッシュを使用**してください
- 開発環境ではプレーンテキストでも可（利便性優先）
- `.env.local` ファイルは絶対にgitにコミットしないでください
- 開発環境の自動ログイン機能は本番環境では無効になります

### 5. Google認証の設定

#### ローカル開発環境

Google Cloud認証を設定します：

```bash
# 1. Google Cloudにログイン
gcloud auth login

# 2. Application Default Credentials (ADC)を設定
gcloud auth application-default login

# 3. プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID
```

**必要な権限:**
- Google Sheets APIの有効化
- Google Sheetsへのアクセス権限（閲覧・編集）

**注意:**
- サービスアカウントキーファイルは不要です（ADCを使用）
- 使用するGoogleアカウントに対象のSpreadsheetsの編集権限が付与されている必要があります

#### GCP Cloud Run（本番環境）

- Managed Identityが自動的に使用されます（追加設定不要）
- Cloud RunのサービスアカウントにGoogle Sheets APIへのアクセス権限を付与してください

### 6. 開発サーバーの起動

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

## セキュリティポリシー

詳細は [SECURITY.md](SECURITY.md) を参照してください。

## コントリビューション

コントリビューションを歓迎します！プルリクエストを送る前に、[CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。

## 行動規範

このプロジェクトは [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md) を採用しています。参加することで、この行動規範を遵守することに同意したものとみなされます。

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。
