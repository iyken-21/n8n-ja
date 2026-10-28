# ライセンスに関する注意

## このリポジトリに含むもの

- `locales/ja.json`：n8n の画面文言の追加訳（キーは n8n の `en.json` と同じ）
- `patches/`：n8n のソースに当てる差分（日本語ロケールの読み込みと、言語の選択欄の追加）
- `scripts/`：ビルドと適用の手順
- 上記の説明文書

このリポジトリで書いた部分は MIT ライセンスです（[LICENSE](LICENSE)）。

## このリポジトリに含まないもの

次のものは再配布しません。

- n8n 本体のソースコード
- n8n をビルドした成果物（`editor-ui-ja/`、`dist/` など）
- n8n の依存ライブラリ（`node_modules/` など）

n8n 本体は、利用者が公式リポジトリ（https://github.com/n8n-io/n8n ）から取得してください。`scripts/build-editor-ui.sh` は、実行した環境で公式リポジトリからソースを取得してビルドします。

## n8n のライセンス

- n8n は [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) の対象です。ファイル名や ディレクトリ名に `.ee.` を含むコードは [n8n Enterprise License](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md) の対象です。
- n8n の文言とコードの権利は n8n GmbH に帰属します。`locales/ja.json` は n8n の文言の翻訳、`patches/` は n8n のソースの一部を差分の前後の行として含みます。これらは n8n のライセンスにも従います。
- editor-ui のビルド成果物には Enterprise License の対象コードが含まれます。そのため成果物は配布せず、自分の環境で使うためだけにビルドしてください。
- 日本語化した n8n を第三者向けのサービスとして提供するなど、Sustainable Use License が認める範囲を超える使い方はしないでください。

## 翻訳の土台

訳の大部分は [Tomatio13/n8n-i18n-japanese](https://github.com/Tomatio13/n8n-i18n-japanese) の `languages/ja.json` を使います。このリポジトリにはライセンスの明記がないため、ファイルは含めません。`scripts/build-editor-ui.sh` がビルド時に固定したコミットから取得し、SHA-256 を確認してから `locales/ja.json` の訳を重ねます。

## その他

個人の非商用プロジェクトです。n8n GmbH とは関係ありません。
