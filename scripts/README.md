# Scripts Directory

このディレクトリには、VOXNTRY プロジェクトで使用する各種スクリプトが含まれています。

## 利用可能なスクリプト

### `hash-password.mjs`
パスワードをbcryptでハッシュ化するスクリプト。

**使用方法:**
```bash
npm run hash-password "yourPassword"
```

**用途:**
- 本番環境用のパスワードハッシュを生成
- `.env.local` または Secret Manager に設定する値を生成

---

### `setup-secrets.sh`
Google Cloud Secret Manager にシークレットを設定するインタラクティブスクリプト。

**使用方法:**
```bash
./scripts/setup-secrets.sh
```

**機能:**
- JWT Secret の生成と登録
- 会議パスワード（bcryptハッシュ）の登録
- conferences.json の登録（オプション）
- サービスアカウントへのアクセス権限付与

**前提条件:**
- gcloud CLI がインストール済み
- Google Cloud プロジェクトへのアクセス権限

**実行例:**
```bash
# Secret Manager のセットアップ
./scripts/setup-secrets.sh

# 対話形式で以下を入力:
# - Google Cloud プロジェクトID
# - JWT Secret（または自動生成）
# - 会議パスワードのbcryptハッシュ
# - サービスアカウントメールアドレス（オプション）
```

---

### `deploy-cloud-run.sh`
Google Cloud Run へのデプロイを自動化するスクリプト。

**使用方法:**
```bash
./scripts/deploy-cloud-run.sh [environment]
```

**引数:**
- `environment` (オプション): デプロイ環境（デフォルト: production）

**機能:**
- Docker イメージのビルド（ローカルまたはCloud Build）
- Cloud Run へのデプロイ
- 環境変数・シークレットの設定
- デプロイオプションの対話的設定

**前提条件:**
- gcloud CLI がインストール済み
- Docker インストール済み（ローカルビルドの場合）
- Google Cloud プロジェクトへのアクセス権限
- Secret Manager にシークレットが設定済み（推奨）

**実行例:**
```bash
# 本番環境へデプロイ
./scripts/deploy-cloud-run.sh production

# 対話形式で以下を入力:
# - Google Cloud プロジェクトID
# - リージョン選択
# - サービス名
# - デプロイオプション（メモリ、CPU、インスタンス数など）
```

**推奨デプロイフロー:**
1. シークレットの設定: `./scripts/setup-secrets.sh`
2. デプロイ実行: `./scripts/deploy-cloud-run.sh`
3. Google Sheets のアクセス権限設定（手動）

---

## デプロイワークフロー

### 初回デプロイ

```bash
# 1. プロジェクトのセットアップ
cd /path/to/voxntry

# 2. 依存関係のインストール
npm install

# 3. 設定ファイルの作成
cp config/conferences.example.json config/conferences.json
# config/conferences.json を編集

# 4. パスワードハッシュの生成
npm run hash-password "yourSecurePassword"
# 出力されたハッシュをメモ

# 5. Secret Manager のセットアップ
./scripts/setup-secrets.sh
# 対話形式で設定

# 6. Cloud Run へデプロイ
./scripts/deploy-cloud-run.sh
# 対話形式でデプロイ

# 7. サービスアカウントに Google Sheets のアクセス権限を付与
# Google Spreadsheet の共有設定で、サービスアカウントに編集者権限を付与
```

### 更新デプロイ

```bash
# コードを更新後、再デプロイ
./scripts/deploy-cloud-run.sh

# 既存の設定が保持されるため、対話形式で確認するだけでOK
```

---

## トラブルシューティング

### スクリプトの実行権限エラー

```bash
chmod +x scripts/*.sh
```

### gcloud CLI が見つからない

Google Cloud SDK をインストール:
```bash
# macOS (Homebrew)
brew install google-cloud-sdk

# その他のOS
# https://cloud.google.com/sdk/docs/install
```

### Secret Manager へのアクセス権限エラー

必要な権限を付与:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/secretmanager.admin"
```

---

## セキュリティに関する注意事項

⚠️ **重要な注意事項:**

1. **bcrypt ハッシュの使用**
   - 本番環境では必ず bcrypt ハッシュを使用
   - プレーンテキストのパスワードは使用しない

2. **シークレットの管理**
   - Secret Manager を使用（環境変数に直接設定しない）
   - シークレットをコード/Git に含めない

3. **アクセス権限**
   - サービスアカウントに最小限の権限のみ付与
   - 不要なアクセス権限は削除

4. **環境分離**
   - 開発環境と本番環境でプロジェクトを分ける
   - それぞれ異なるシークレットを使用

---

## 詳細なドキュメント

より詳細なデプロイ手順については、以下を参照してください:
- [DEPLOY_CLOUD_RUN.md](../docs/DEPLOY_CLOUD_RUN.md) - Cloud Run デプロイの完全ガイド
- [README.md](../README.md) - プロジェクト全体のドキュメント
