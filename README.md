# n8n 日本語化

n8n の画面（editor-ui）を日本語にするための差分・翻訳・ビルド手順です。対象は **n8n 2.45.4** です。

- n8n 本体は含みません。ビルド済みファイルも配布しません。
- 公式リポジトリから n8n のソースを取得し、自分の環境で日本語化した editor-ui をビルドします。
- 個人設定の「パーソナライズ」に言語の選択欄（日本語 / English）を追加します。選んだ言語はブラウザごとに保存されます。

## 構成

| パス | 内容 |
| --- | --- |
| `locales/ja.json` | 追加の訳（キーは n8n の `en.json` と同じ） |
| `patches/n8n@2.45.4/ja-locale.patch` | n8n のソースに当てる差分 |
| `scripts/build-editor-ui.sh` | ソースの取得からビルド、配置まで |
| `scripts/apply-to-vps.md` | VPS への適用手順 |
| `LICENSE-NOTES.md` | ライセンスに関する注意 |

訳の大部分は [Tomatio13/n8n-i18n-japanese](https://github.com/Tomatio13/n8n-i18n-japanese) の `ja.json` を使います。ビルド時に固定したコミットから取得し、`locales/ja.json` の訳を上に重ねます。

パッチの内容は次の 3 つです。

- 日本語ロケール（`ja.json`）を必要なときに読み込む
- ブラウザに保存した言語を、サーバーの既定（`N8N_DEFAULT_LOCALE`）より優先する
- 個人設定に言語の選択欄を追加する

## VPS でビルドして適用する

必要なもの：git、curl、Node.js 24 以上（corepack を含む）、メモリ 8GB 程度。

```sh
sudo git clone https://github.com/iyken-21/n8n-ja.git /opt/n8n-ja
sudo /opt/n8n-ja/scripts/build-editor-ui.sh 2.45.4
```

成果物は `/var/www/n8n/editor-ui-ja` に置かれます。Docker Compose でマウントし、`.env` に `N8N_DEFAULT_LOCALE=ja` を追加して再起動します。

```yaml
volumes:
  - /var/www/n8n/editor-ui-ja:/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist:ro
```

詳しい手順、動作確認、ロールバックは [scripts/apply-to-vps.md](scripts/apply-to-vps.md) を参照してください。

| 環境変数 | 既定値 | 内容 |
| --- | --- | --- |
| `N8N_JA_BUILD_DIR` | `/opt/n8n-ja-build` | ビルド作業ディレクトリ |
| `N8N_JA_DEPLOY_DIR` | `/var/www/n8n/editor-ui-ja` | 成果物の配置先 |

## n8n のバージョンを上げるとき

editor-ui は n8n 本体とバージョンを合わせる必要があります。

1. `patches/n8n@<version>/ja-locale.patch` を用意します。2.45.4 のパッチがそのまま当たるか、`git apply --check` で確認してください。
2. `scripts/build-editor-ui.sh <version>` を実行します。
3. Docker Compose のイメージのバージョンを合わせて再起動します。

## 補足

- 言語の切り替えは、ブラウザの localStorage の `n8n-ui-locale` に保存します。消すとサーバーの既定に戻ります。
- ノード名やノードの設定項目は n8n 本体側の定義のため、日本語になりません。

## ライセンス

- このリポジトリで書いた部分は MIT ライセンスです（[LICENSE](LICENSE)）。
- n8n は Sustainable Use License と n8n Enterprise License の対象です。n8n 本体、ビルド成果物、依存ライブラリは再配布しないでください。
- 詳しくは [LICENSE-NOTES.md](LICENSE-NOTES.md) を参照してください。
- 個人の非商用プロジェクトです。n8n GmbH とは関係ありません。
