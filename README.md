# n8n 日本語化

n8n の画面（editor-ui）を日本語にするための設定とパッチです。

- ベースは [Tomatio13/n8n-i18n-japanese](https://github.com/Tomatio13/n8n-i18n-japanese) のリリース（日本語版 editor-ui）です。
- `i18n/ja-extra.json` で、足りない訳を追加・上書きします。
- 個人設定の「パーソナライズ」に言語の選択欄（日本語 / English）を追加します。選んだ言語はブラウザごとに保存されます。

## 構成

| パス | 内容 |
| --- | --- |
| `compose.yml` | ローカル用の n8n（Podman / Docker Compose） |
| `i18n/ja-extra.json` | 追加の訳（キーは n8n の `en.json` と同じ） |
| `scripts/build.mjs` | リリースを取得し、パッチを当てて `editor-ui-ja/` を作る |
| `scripts/patches.mjs` | パッチの中身 |

`editor-ui-ja/` はビルドで作るため、リポジトリには含めません。

## 使い方

```sh
node scripts/build.mjs        # editor-ui-ja/ を作成（Node.js 18 以上）
podman compose up -d          # 初回
podman restart n8n-local      # 2 回目以降（訳やパッチを変えたとき）
```

n8n は起動時に editor-ui をコピーして使うため、`editor-ui-ja/` を作り直したら再起動が必要です。

## サーバーに適用する

1. このリポジトリを clone します。
2. `node scripts/build.mjs` を実行します。Node.js がないサーバーでは、n8n のイメージで実行できます。

   ```sh
   docker run --rm --entrypoint node -u "$(id -u):$(id -g)" \
     -v "$PWD":/work -w /work docker.io/n8nio/n8n:2.45.4 scripts/build.mjs
   ```

3. サーバーの n8n の設定に、次の 2 つを追加します。

   ```yaml
   environment:
     N8N_DEFAULT_LOCALE: ja
   volumes:
     - /path/to/this/repo/editor-ui-ja:/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist:ro
   ```

4. n8n を再起動します。

更新するときは `git pull` → `node scripts/build.mjs` → n8n を再起動、の順に実行します。

## n8n のバージョンを上げるとき

editor-ui は n8n 本体とバージョンを合わせる必要があります。

1. Tomatio13/n8n-i18n-japanese に同じバージョンのリリースがあることを確認します。
2. `scripts/build.mjs` の `N8N_VERSION` と `RELEASE_SHA256` を更新します。ハッシュは次のコマンドで確認できます。

   ```sh
   gh release view 'n8n@<version>' -R Tomatio13/n8n-i18n-japanese --json assets -q '.assets[].digest'
   ```

3. `compose.yml`（とサーバーの設定）のイメージのバージョンを合わせます。
4. `node scripts/build.mjs` を実行します。パッチの置換箇所が見つからない場合はエラーで止まるので、`scripts/patches.mjs` を新しいバージョンに合わせて直します。

## 補足

- パッチを当てたファイルは、ブラウザのキャッシュを避けるために内容のハッシュで名前を変えます。古い名前は新しいファイルを読み込む中継ファイルとして残します（`editor-ui-ja/.renames.json` に履歴を記録）。
- 言語の切り替えは、ブラウザの localStorage の `n8n-ui-locale` に保存します。消すとサーバーの既定（`N8N_DEFAULT_LOCALE`）に戻ります。
- ノード名やノードの設定項目は n8n 本体側の定義のため、日本語になりません。
