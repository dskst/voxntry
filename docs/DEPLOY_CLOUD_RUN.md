# VOXNTRY - Cloud Run デプロイ手順書

このドキュメントでは、VOXNTRYをGoogle Cloud Run上にデプロイする手順を説明します。

## 前提条件

### 必要なツール
- Google Cloud CLI (gcloud) がインストール済み
- Dockerがインストール済み（ローカルビルドする場合）
- Google Cloudプロジェクトが作成済み

### 必要な権限
- Cloud Run Admin
- Service Account User
- Artifact Registry Admin（Container Registryを使用する場合）
- Secret Manager Admin（推奨）

---

## 1. Google Cloud プロジェクトの初期設定

### 1.1 認証とプロジェクト設定

```bash
# Google Cloudにログイン
gcloud auth login

# プロジェクトIDを設定
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sheets.googleapis.com \
  secretmanager.googleapis.com
```

### 1.2 環境変数の設定

```bash
# デプロイに使用する環境変数を設定
export REGION="asia-northeast1"  # 東京リージョン
export SERVICE_NAME="voxntry"
export IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
```

---

## 2. 設定ファイルの準備

### 2.1 会議設定ファイルの作成

```bash
# サンプルからコピー
cp config/conferences.example.json config/conferences.json

# 設定ファイルを編集
# - id: 会議の一意なID
# - name: 会議名
# - passwordEnvVar: パスワード環境変数名
# - spreadsheetId: Google SpreadsheetのID
# - sheetConfig: シートの列マッピング
```

### 2.2 JWT Secretの生成

```bash
# JWT Secretを生成（32文字以上推奨）
openssl rand -base64 32
```

この値をメモしておきます。

### 2.3 パスワードのハッシュ化

```bash
# bcryptハッシュを生成
npm install  # 依存関係のインストール
npm run hash-password "your-secure-password"
```

生成されたハッシュ値をメモしておきます。

---

## 3. Secret Manager の設定（推奨）

機密情報はSecret Managerで管理することを強く推奨します。

### 3.1 JWT Secretの登録

```bash
# JWT Secretを登録
echo -n "your-generated-jwt-secret" | \
  gcloud secrets create jwt-secret \
  --data-file=- \
  --replication-policy="automatic"
```

### 3.2 会議パスワードの登録

```bash
# 会議パスワード（bcryptハッシュ）を登録
echo -n '$2b$12$...' | \
  gcloud secrets create conference-password \
  --data-file=- \
  --replication-policy="automatic"
```

### 3.3 会議設定ファイルの登録（オプション）

```bash
# conferences.jsonファイルをシークレットとして登録
gcloud secrets create conferences-config \
  --data-file=config/conferences.json \
  --replication-policy="automatic"
```

---

## 4. Google Sheets APIの設定

### 4.1 サービスアカウントへの権限付与

Cloud Runサービスのサービスアカウントに、Google Sheetsへのアクセス権限を付与します。

```bash
# Cloud Runのデフォルトサービスアカウントを確認
export SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# または、カスタムサービスアカウントを作成
gcloud iam service-accounts create voxntry-sa \
  --display-name="VOXNTRY Service Account"

export SERVICE_ACCOUNT="voxntry-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 4.2 Google Spreadsheetへのアクセス権限付与

Google Spreadsheet の共有設定で、サービスアカウントのメールアドレス（`SERVICE_ACCOUNT`）に**編集者**権限を付与してください。

---

## 5. Dockerイメージのビルドとプッシュ

### 方法A: Cloud Buildを使用（推奨）

```bash
# Cloud Buildを使用してビルド
gcloud builds submit \
  --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --timeout=20m
```

### 方法B: ローカルでビルド

```bash
# ローカルでDockerイメージをビルド
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME} .

# Google Container Registryに認証
gcloud auth configure-docker

# イメージをプッシュ
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}
```

---

## 6. Cloud Runへのデプロイ

### 6.1 環境変数を使用したデプロイ

```bash
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s \
  --max-instances 10 \
  --service-account ${SERVICE_ACCOUNT} \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "JWT_SECRET=your-jwt-secret" \
  --set-env-vars "CONFERENCE_YOUR_CONF_PASSWORD=your-bcrypt-hash"
```

⚠️ **セキュリティ注意**: この方法では機密情報がコマンド履歴に残ります。本番環境では次のSecret Manager方式を使用してください。

### 6.2 Secret Managerを使用したデプロイ（推奨）

```bash
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s \
  --max-instances 10 \
  --service-account ${SERVICE_ACCOUNT} \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "JWT_SECRET=jwt-secret:latest" \
  --set-secrets "CONFERENCE_YOUR_CONF_PASSWORD=conference-password:latest"
```

### 6.3 デプロイオプションの説明

| オプション | 説明 | 推奨値 |
|-----------|------|--------|
| `--memory` | メモリ制限 | 512Mi〜1Gi |
| `--cpu` | CPU割り当て | 1〜2 |
| `--timeout` | リクエストタイムアウト | 60s〜300s |
| `--max-instances` | 最大インスタンス数 | 10〜100 |
| `--min-instances` | 最小インスタンス数（コールドスタート回避） | 0〜1 |
| `--allow-unauthenticated` | 認証不要でアクセス可能 | 用途に応じて |

---

## 7. デプロイ後の確認

### 7.1 サービスURLの取得

```bash
# デプロイされたサービスのURLを取得
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format='value(status.url)'
```

### 7.2 ヘルスチェック

```bash
# ヘルスチェックエンドポイントを確認
export SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format='value(status.url)')

curl ${SERVICE_URL}/api/health
```

正常な場合の応答例:
```json
{
  "status": "healthy",
  "timestamp": "2025-02-09T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### 7.3 ログの確認

```bash
# リアルタイムでログを確認
gcloud run services logs tail ${SERVICE_NAME} \
  --region ${REGION}

# 最近のエラーログを確認
gcloud run services logs read ${SERVICE_NAME} \
  --region ${REGION} \
  --limit 50 \
  --filter "severity>=ERROR"
```

---

## 8. 更新デプロイ

アプリケーションを更新する場合：

```bash
# 1. 新しいイメージをビルド
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME}

# 2. Cloud Runサービスを更新（自動的に新イメージを使用）
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --region ${REGION}
```

---

## 9. カスタムドメインの設定（オプション）

### 9.1 ドメインマッピングの作成

```bash
# カスタムドメインをマッピング
gcloud run domain-mappings create \
  --service ${SERVICE_NAME} \
  --domain your-domain.com \
  --region ${REGION}
```

### 9.2 DNS設定

表示されるDNSレコードを、ドメインレジストラのDNS設定に追加してください。

---

## 10. トラブルシューティング

### 問題: デプロイ後に500エラーが発生

**確認項目:**
1. 環境変数が正しく設定されているか
2. Secret Managerへのアクセス権限があるか
3. Google Sheetsへのアクセス権限があるか
4. conferences.jsonの設定が正しいか

```bash
# 環境変数の確認
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format='yaml(spec.template.spec.containers[0].env)'

# ログでエラーを確認
gcloud run services logs read ${SERVICE_NAME} \
  --region ${REGION} \
  --limit 100 \
  --filter "severity>=ERROR"
```

### 問題: Google Sheetsに接続できない

**確認項目:**
1. Google Sheets APIが有効化されているか
2. サービスアカウントにSpreadsheetの編集権限があるか
3. spreadsheetIdが正しいか

```bash
# サービスアカウントの確認
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format='value(spec.template.spec.serviceAccountName)'
```

### 問題: Secret Managerからシークレットを読み込めない

**確認項目:**
サービスアカウントに Secret Manager へのアクセス権限を付与:

```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 11. セキュリティのベストプラクティス

### 11.1 最小権限の原則

カスタムサービスアカウントを作成し、必要最小限の権限のみを付与:

```bash
# サービスアカウントに必要な権限のみを付与
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### 11.2 認証の追加

内部利用の場合は、Cloud Run の IAM 認証を有効化:

```bash
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --no-allow-unauthenticated
```

### 11.3 VPCコネクタの使用（オプション）

プライベートなリソースにアクセスする場合、VPC Connectorを設定:

```bash
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --vpc-connector your-vpc-connector
```

---

## 12. コスト最適化

### 12.1 最小インスタンスの設定

コールドスタートを許容できる場合は、最小インスタンス数を0に:

```bash
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --min-instances 0
```

### 12.2 リソースの最適化

使用状況に応じてメモリとCPUを調整:

```bash
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --memory 256Mi \
  --cpu 1
```

---

## 13. CI/CDパイプラインの設定（参考）

### Cloud Buildを使用した自動デプロイ

`cloudbuild.yaml` を作成:

```yaml
steps:
  # Docker イメージをビルド
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/voxntry', '.']

  # イメージをプッシュ
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/voxntry']

  # Cloud Run にデプロイ
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'voxntry'
      - '--image'
      - 'gcr.io/$PROJECT_ID/voxntry'
      - '--region'
      - 'asia-northeast1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/voxntry'
```

GitHub連携の設定:

```bash
gcloud builds triggers create github \
  --repo-name=voxntry \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## まとめ

このドキュメントに従って、VOXNTRYをCloud Run上にデプロイできます。

**重要なポイント:**
- 機密情報は必ずSecret Managerで管理
- サービスアカウントに最小限の権限のみ付与
- Google Spreadsheetへのアクセス権限を忘れずに設定
- デプロイ後は必ずヘルスチェックとログを確認

**追加のサポート:**
- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Google Sheets API ドキュメント](https://developers.google.com/sheets/api)
