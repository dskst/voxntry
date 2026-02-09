# CI/CD Pipeline Setup Guide

このドキュメントでは、VOXNTRYプロジェクトのCI/CDパイプラインのセットアップ手順を説明します。

## 概要

CI/CDパイプラインは以下の機能を提供します:

- **継続的インテグレーション (CI)**
  - Lint & Type Check
  - セキュリティスキャン (Trivy, CodeQL, TruffleHog)
  - ビルド検証
  - 依存関係レビュー
  - パフォーマンス監査 (Lighthouse)

- **継続的デプロイメント (CD)**
  - GCP Cloud Runへの自動デプロイ
  - Docker イメージのビルドと公開

- **自動化**
  - Dependabotによる依存関係の自動更新
  - PRの自動ラベリング
  - Stale issueの自動クローズ

## セットアップ手順

### 1. GitHub Secretsの設定

以下のSecretsをGitHubリポジトリに設定してください:

#### GCP Cloud Run デプロイ用

```bash
# GCP プロジェクトID
GCP_PROJECT_ID=your-project-id

# Workload Identity Federation (推奨)
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_NAME/providers/PROVIDER_NAME

# サービスアカウント
GCP_SERVICE_ACCOUNT=github-actions@your-project-id.iam.gserviceaccount.com

# アプリケーション用シークレット
DEMO_SPREADSHEET_ID=your-spreadsheet-id
CONFERENCE_PASSWORD=your-secure-password
```

#### オプション

```bash
# SonarCloud (コード品質分析)
SONAR_TOKEN=your-sonar-token

# Lighthouse CI
LHCI_GITHUB_APP_TOKEN=your-lhci-token
```

### 2. GCP Workload Identity Federationの設定

Workload Identity Federationを使用すると、サービスアカウントキーを使わずに安全にGCPにアクセスできます。

```bash
# 1. Workload Identity Poolの作成
gcloud iam workload-identity-pools create "github-actions" \
  --project="${GCP_PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Workload Identity Providerの作成
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${GCP_PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. サービスアカウントの作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --project="${GCP_PROJECT_ID}"

# 4. サービスアカウントに権限を付与
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# 5. Workload Identity Poolとサービスアカウントのバインド
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${GCP_PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_GITHUB_ORG/voxntry"
```

### 3. GCP Secret Managerの設定

環境変数をSecret Managerで管理します:

```bash
# 1. Secret Managerの有効化
gcloud services enable secretmanager.googleapis.com

# 2. Secretの作成
echo -n "your-secure-password" | gcloud secrets create demo-conf-password \
  --data-file=- \
  --replication-policy="automatic"

echo -n "your-spreadsheet-id" | gcloud secrets create demo-spreadsheet-id \
  --data-file=- \
  --replication-policy="automatic"

# 3. Cloud RunサービスアカウントにSecret Managerへのアクセス権を付与
gcloud secrets add-iam-policy-binding demo-conf-password \
  --member="serviceAccount:github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding demo-spreadsheet-id \
  --member="serviceAccount:github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. GitHub Actionsの有効化

1. GitHubリポジトリの **Settings** → **Actions** → **General**
2. **Actions permissions** を "Allow all actions and reusable workflows" に設定
3. **Workflow permissions** を "Read and write permissions" に設定

### 5. Branch Protectionの設定

1. GitHubリポジトリの **Settings** → **Branches**
2. **main** ブランチに以下のルールを追加:
   - Require status checks to pass before merging
     - `lint-and-typecheck`
     - `build`
     - `security-scan`
   - Require pull request reviews before merging (1 approver)
   - Dismiss stale pull request approvals when new commits are pushed
   - Require linear history
   - Include administrators

## ワークフローの説明

### CI Pipeline (`ci.yml`)

Pull RequestとPushで実行されるメインのCIパイプライン:

- **Lint & Type Check**: ESLintとTypeScriptの型チェック
- **Build**: Next.jsアプリケーションのビルド検証
- **Security Scan**: Trivyによる脆弱性スキャン、GitHub Security Tabへの結果アップロード
- **Code Quality**: コード品質チェック (SonarCloud対応)

### Deploy to Production (`deploy-production.yml`)

`main` ブランチへのPushまたはタグのプッシュ時に実行:

1. Lint & Build検証
2. Dockerイメージのビルド
3. Google Container Registryへのプッシュ
4. Cloud Runへのデプロイ

### Pull Request Checks (`pr-checks.yml`)

Pull Request専用のチェック:

- PR titleのフォーマット検証 (Conventional Commits)
- 大きなファイルの検出
- Secretsスキャン (TruffleHog)
- Bundle sizeの分析
- 依存関係のレビュー
- 自動ラベリング

### CodeQL Analysis (`codeql.yml`)

セキュリティ脆弱性の静的解析:

- JavaScriptとTypeScriptのコード分析
- 毎週月曜日と各Push/PRで実行
- GitHub Security Tabで結果を確認

### Lighthouse (`lighthouse.yml`)

パフォーマンス監査:

- PRでフロントエンドファイルが変更された時に実行
- Performance、Accessibility、Best Practices、SEOをチェック
- 結果はArtifactとして保存

### Stale Issues (`stale.yml`)

古いIssueとPRの自動クローズ:

- Issues: 60日間アクティビティなし → 7日後にクローズ
- PRs: 30日間アクティビティなし → 14日後にクローズ

## バッジの追加

以下のバッジをREADME.mdに追加できます:

```markdown
[![CI Pipeline](https://github.com/YOUR_USERNAME/voxntry/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/voxntry/actions/workflows/ci.yml)
[![Deploy to Production](https://github.com/YOUR_USERNAME/voxntry/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/YOUR_USERNAME/voxntry/actions/workflows/deploy-production.yml)
[![CodeQL](https://github.com/YOUR_USERNAME/voxntry/actions/workflows/codeql.yml/badge.svg)](https://github.com/YOUR_USERNAME/voxntry/actions/workflows/codeql.yml)
```

## トラブルシューティング

### デプロイが失敗する

1. GitHub Secretsが正しく設定されているか確認
2. GCP Workload Identity Federationの設定を確認
3. サービスアカウントの権限を確認
4. Cloud Run APIが有効になっているか確認

```bash
gcloud services enable run.googleapis.com
```

### Dockerビルドが失敗する

1. `next.config.ts` に `output: 'standalone'` が設定されているか確認
2. `.dockerignore` が正しく設定されているか確認
3. ビルドログを確認してエラー原因を特定

### セキュリティスキャンで誤検知がある

- `.trivyignore` ファイルを作成して特定の脆弱性を除外
- CodeQLの `.github/codeql/codeql-config.yml` でクエリをカスタマイズ

## ベストプラクティス

1. **Secretsの管理**:
   - 環境変数は必ずGitHub SecretsまたはGCP Secret Managerで管理
   - `.env` ファイルは絶対にコミットしない

2. **セキュリティ**:
   - Dependabotを有効にして依存関係を常に最新に保つ
   - セキュリティスキャンの結果を定期的に確認

3. **パフォーマンス**:
   - Lighthouseのスコアを定期的に確認
   - Bundle sizeの増加に注意

4. **コード品質**:
   - PRは必ずレビューを受ける
   - すべてのCIチェックがパスしてからマージ

## 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
