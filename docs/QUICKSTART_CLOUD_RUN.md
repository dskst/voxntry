# Cloud Run クイックスタートガイド

このガイドでは、VOXNTRY を最速で Google Cloud Run にデプロイする手順を説明します。

## ⏱️ 所要時間: 約15分

---

## 📋 事前準備

### 1. 必要なもの

- [ ] Google Cloud アカウント
- [ ] Google Cloud プロジェクト（作成済み）
- [ ] gcloud CLI インストール済み
- [ ] Google Spreadsheet（参加者リスト用）

### 2. ローカルセットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd voxntry

# 依存関係のインストール
npm install

# 設定ファイルの作成
cp config/conferences.example.json config/conferences.json
```

### 3. 会議設定の編集

`config/conferences.json` を編集:

```json
{
  "conferences": [
    {
      "id": "my-conference-2025",
      "name": "My Conference 2025",
      "passwordEnvVar": "CONFERENCE_MY_CONF_PASSWORD",
      "spreadsheetId": "YOUR_SPREADSHEET_ID_HERE",
      "sheetConfig": {
        "sheetName": "シート1",
        "startRow": 2,
        "columns": {
          "id": 0,
          "name": 3,
          "checkedIn": 10,
          "checkedInAt": 11,
          "staffName": 12
        }
      }
    }
  ]
}
```

**重要:** `spreadsheetId` は Google Spreadsheet の URL から取得:
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
                                      ↑この部分
```

---

## 🚀 デプロイ手順

### ステップ 1: パスワードハッシュを生成

```bash
npm run hash-password "your-secure-password"
```

**出力例:**
```
Password Hash (copy this):
$2b$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF
```

このハッシュをコピーしてメモしておきます。

---

### ステップ 2: Secret Manager のセットアップ

**方法1: セットアップスクリプトを使用（推奨）**

```bash
./scripts/setup-secrets.sh
```

**対話形式で入力:**
1. **Google Cloud Project ID**: あなたのプロジェクトID
2. **JWT Secret**: Enter を押して自動生成（または手動入力）
3. **Conference Password**: ステップ1で生成したハッシュを貼り付け
4. **Store conferences.json**: `n` (No)
5. **Service Account Email**: 空Enter（後で設定）

**方法2: 手動でシークレットを作成**

```bash
# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# Secret Manager APIを有効化
gcloud services enable secretmanager.googleapis.com

# JWT秘密鍵を自動生成して作成
openssl rand -base64 32 | gcloud secrets create jwt-secret --data-file=-

# 会議パスワードのハッシュを作成（ステップ1で生成したハッシュを使用）
echo -n '$2b$12$YOUR_BCRYPT_HASH_HERE' | gcloud secrets create conference-password --data-file=-
```

**作成したシークレットを確認:**
```bash
gcloud secrets list
```

---

### ステップ 3: Cloud Run へデプロイ

```bash
./scripts/deploy-cloud-run.sh
```

**対話形式で入力:**
1. **Project ID**: あなたのプロジェクトID
2. **Region**: `1` (Tokyo) を選択
3. **Service name**: Enter（デフォルト: voxntry）
4. **Continue with deployment**: `y`
5. **Use Secret Manager**: `Y`
6. **Password environment variable name**: `conferences.json`で定義した`passwordEnvVar`の値を入力
   - 例: `CONFERENCE_MY_CONF_PASSWORD`
7. **Secrets configured**: `y`（ステップ2でシークレットを作成済みの場合）
8. **Allow unauthenticated**: `Y`
9. **Memory/CPU/Instances**: Enter（デフォルト値を使用）

デプロイ完了まで **5〜10分** 待ちます。

---

### ステップ 4: サービスアカウントの確認

デプロイ完了後、サービスアカウントのメールアドレスが表示されます:

```
Service Account: PROJECT_ID@appspot.gserviceaccount.com
```

このメールアドレスをコピーします。

---

### ステップ 5: Google Sheets のアクセス権限設定

1. Google Spreadsheet を開く
2. 右上の「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを追加
4. 権限を「編集者」に設定
5. 「送信」をクリック

---

## ✅ 動作確認

### 1. ヘルスチェック

デプロイ完了時に表示された URL を使用:

```bash
curl https://voxntry-xxxxx-an.a.run.app/api/health
```

**期待される出力:**
```json
{
  "status": "healthy",
  "timestamp": "2025-02-09T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 2. Web アプリケーションにアクセス

ブラウザで以下を開く:
```
https://voxntry-xxxxx-an.a.run.app
```

ログイン画面が表示されれば成功です！

### 3. ログイン

- **会議ID**: `my-conference-2025` (conferences.json の id)
- **パスワード**: ステップ1で設定したパスワード（プレーンテキスト）
- **スタッフ名**: あなたの名前

---

## 🔧 トラブルシューティング

### エラー: "Failed to fetch attendees"

**原因:** Google Sheets へのアクセス権限が不足

**解決方法:**
1. サービスアカウントに Spreadsheet の編集者権限があるか確認
2. spreadsheetId が正しいか確認
3. Google Sheets API が有効化されているか確認
   ```bash
   gcloud services enable sheets.googleapis.com
   ```

### エラー: "Invalid credentials"

**原因:** パスワードまたは会議IDが間違っている

**解決方法:**
1. conferences.json の id が正しいか確認
2. パスワードがステップ1で設定したものと一致するか確認

### エラー: 500 Internal Server Error

**原因:** 環境変数やシークレットの設定ミス

**解決方法:**
ログを確認:
```bash
gcloud run services logs read voxntry \
  --region asia-northeast1 \
  --limit 50
```

---

## 📊 次のステップ

### カスタムドメインの設定

```bash
gcloud run domain-mappings create \
  --service voxntry \
  --domain your-domain.com \
  --region asia-northeast1
```

表示された DNS レコードをドメインレジストラに設定します。

### 認証の追加（内部利用の場合）

```bash
gcloud run services update voxntry \
  --region asia-northeast1 \
  --no-allow-unauthenticated
```

### モニタリングの設定

Cloud Console でモニタリングダッシュボードを開く:
```
https://console.cloud.google.com/run/detail/asia-northeast1/voxntry/metrics
```

---

## 🔒 セキュリティチェックリスト

デプロイ後、以下を確認してください:

- [ ] Secret Manager でシークレットを管理している
- [ ] bcrypt ハッシュを使用している（プレーンテキストではない）
- [ ] サービスアカウントに最小限の権限のみ付与
- [ ] Google Sheets の共有設定で不要なアクセス権限がない
- [ ] HTTPS が有効（Cloud Run はデフォルトで有効）
- [ ] 本番環境用の強力なパスワードを設定

---

## 📚 詳細ドキュメント

さらに詳しい情報:
- [完全なデプロイガイド](DEPLOY_CLOUD_RUN.md)
- [スクリプトの詳細](../scripts/README.md)
- [プロジェクトREADME](README.md)

---

## 🆘 サポート

問題が解決しない場合:
1. [Issue を作成](https://github.com/your-repo/issues)
2. ログを添付:
   ```bash
   gcloud run services logs read voxntry --region asia-northeast1 --limit 100 > logs.txt
   ```
3. 設定ファイル（機密情報を除く）を共有

---

## 🎉 デプロイ完了

お疲れ様でした！VOXNTRY が Cloud Run 上で稼働しています。

**便利なコマンド:**

```bash
# ログをリアルタイムで確認
gcloud run services logs tail voxntry --region asia-northeast1

# サービス情報を確認
gcloud run services describe voxntry --region asia-northeast1

# サービスを削除（必要に応じて）
gcloud run services delete voxntry --region asia-northeast1
```
