# VPS への適用手順

n8n 2.45.4 を Docker Compose で動かしている VPS に、日本語化した editor-ui を適用する手順です。

## 必要なもの

- git、curl
- Node.js 24 以上（corepack を含む）
- メモリ 8GB 程度（editor-ui のビルドで `--max-old-space-size=8192` を使います）。足りない場合はスワップを追加してください。
- ディスク 10GB 程度の空き（n8n のソースと依存パッケージ）

## 1. リポジトリを取得する

```sh
sudo git clone https://github.com/iyken-21/n8n-ja.git /opt/n8n-ja
# 更新するとき
sudo git -C /opt/n8n-ja pull
```

## 2. ビルドする

```sh
sudo /opt/n8n-ja/scripts/build-editor-ui.sh 2.45.4
```

- 公式リポジトリから `n8n@2.45.4` のソースを `/opt/n8n-ja-build/n8n` に取得し、訳とパッチを当ててビルドします。
- 成果物は `/var/www/n8n/editor-ui-ja` に置かれます（既存のものは削除してから置き換えます）。
- 場所を変えるときは環境変数で指定します。

  ```sh
  sudo N8N_JA_BUILD_DIR=/srv/n8n-ja-build N8N_JA_DEPLOY_DIR=/srv/editor-ui-ja \
    /opt/n8n-ja/scripts/build-editor-ui.sh 2.45.4
  ```

初回は依存パッケージのインストールとビルドに数十分かかります。

## 3. Docker Compose の設定

`docker-compose.yml` の n8n サービスにマウントを追加します。イメージのバージョンはビルドしたバージョンと合わせます。

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:2.45.4
    env_file: .env
    volumes:
      - n8n_data:/home/node/.n8n
      - /var/www/n8n/editor-ui-ja:/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist:ro
```

`.env` に次の行を追加します。

```sh
N8N_DEFAULT_LOCALE=ja
```

## 4. 再起動する

n8n は起動時に editor-ui をコピーして使うため、ビルドし直したときも再起動が必要です。

```sh
docker compose up -d --force-recreate n8n
```

## 5. 動作確認

```sh
docker compose ps
docker compose logs --tail=50 n8n
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:5678/   # 200 なら正常
```

ブラウザで開き、メニューが日本語になっていることを確認します。古い画面が出るときは、ブラウザで「キャッシュの消去とハード再読み込み」を行ってください。

個人設定（Settings > Personal）の「パーソナライズ」にある「言語」で、日本語と English を切り替えられます。選んだ言語はブラウザごとに保存されます。

## ロールバック

1. `docker-compose.yml` から editor-ui-ja のマウント行を削除します。
2. `.env` から `N8N_DEFAULT_LOCALE=ja` を削除します（残しても英語で表示されます）。
3. `docker compose up -d --force-recreate n8n` で再起動します。

公式の英語版 editor-ui に戻ります。データ（`n8n_data`）には影響しません。

マウントしたまま `/var/www/n8n/editor-ui-ja` が空、または `index.html` がないと、画面が Internal Server Error になります。その場合もマウント行を外して再起動すれば復旧します。
