#!/usr/bin/env bash
# 公式 n8n ソースから日本語化した editor-ui をビルドし、N8N_JA_DEPLOY_DIR に配置する。
#
# 使い方: scripts/build-editor-ui.sh [n8n のバージョン（既定: 2.45.4）]
#   N8N_JA_BUILD_DIR   ビルド作業ディレクトリ（既定: /opt/n8n-ja-build）
#   N8N_JA_DEPLOY_DIR  配置先（既定: /var/www/n8n/editor-ui-ja）
#
# 何度実行しても同じ結果になる。ソースは毎回タグの状態に戻してからパッチを当てる。
set -euo pipefail

N8N_VERSION="${1:-2.45.4}"
BUILD_DIR="${N8N_JA_BUILD_DIR:-/opt/n8n-ja-build}"
DEPLOY_DIR="${N8N_JA_DEPLOY_DIR:-/var/www/n8n/editor-ui-ja}"

TAG="n8n@${N8N_VERSION}"
N8N_REPO_URL="https://github.com/n8n-io/n8n.git"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${BUILD_DIR}/n8n"
PATCH_FILE="${REPO_DIR}/patches/${TAG}/ja-locale.patch"
LOCALES_DIR="${SRC_DIR}/packages/frontend/@n8n/i18n/src/locales"

# 訳の土台。Tomatio13/n8n-i18n-japanese の ja.json はライセンスの明記がないため、
# このリポジトリには含めず、ビルド時に取得して locales/ja.json の訳を上書きで重ねる
BASE_JA_URL="https://raw.githubusercontent.com/Tomatio13/n8n-i18n-japanese/0122a3a7d8abea7d6fbee5522ae233e653a9d57e/languages/ja.json"
BASE_JA_SHA256="23fb4f0a2303425679bfc6d587104cf8b44809309c5d5740e85305f11b774f30"

log() { printf '[build-editor-ui] %s\n' "$*"; }
die() { printf '[build-editor-ui] エラー: %s\n' "$*" >&2; exit 1; }

sha256_of() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | cut -d' ' -f1
	else
		shasum -a 256 "$1" | cut -d' ' -f1
	fi
}

for cmd in git curl node corepack; do
	command -v "$cmd" >/dev/null 2>&1 || die "$cmd が見つかりません"
done
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 24 ] || die "Node.js 24 以上が必要です（現在 $(node --version)）"

log "n8n ${TAG} のソースを用意します: ${SRC_DIR}"
mkdir -p "$BUILD_DIR"
if [ -d "${SRC_DIR}/.git" ]; then
	git -C "$SRC_DIR" fetch --quiet --depth 1 origin tag "$TAG"
	# 前回当てたパッチや追加したファイルを消し、タグの状態に戻す（node_modules は残す）
	git -C "$SRC_DIR" -c advice.detachedHead=false checkout --quiet --force "$TAG"
	git -C "$SRC_DIR" clean --quiet -fd
else
	git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$TAG" "$N8N_REPO_URL" "$SRC_DIR"
fi

log "訳を配置します"
BASE_JA="${BUILD_DIR}/ja.base.json"
curl -fsSL "$BASE_JA_URL" -o "$BASE_JA"
[ "$(sha256_of "$BASE_JA")" = "$BASE_JA_SHA256" ] || die "取得した ja.json のハッシュが一致しません: ${BASE_JA_URL}"
node -e '
	const fs = require("fs");
	const [base, extra, out] = process.argv.slice(1);
	const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
	fs.writeFileSync(out, JSON.stringify({ ...read(base), ...read(extra) }, null, "\t") + "\n");
' "$BASE_JA" "${REPO_DIR}/locales/ja.json" "${LOCALES_DIR}/ja.json"

if [ -f "$PATCH_FILE" ]; then
	log "パッチを当てます: ${PATCH_FILE#"$REPO_DIR"/}"
	git -C "$SRC_DIR" apply "$PATCH_FILE"
else
	log "${TAG} 用のパッチはありません"
fi

log "依存関係をインストールします"
cd "$SRC_DIR"
# n8n が指定する pnpm を使う。root 以外でも動くよう shim は作業ディレクトリに置き、PATH の先頭に加える
# （n8n の prepare スクリプトが内部で pnpm を呼ぶため、PATH 上の pnpm を差し替える必要がある）
mkdir -p "${BUILD_DIR}/bin"
corepack enable --install-directory "${BUILD_DIR}/bin" pnpm
export PATH="${BUILD_DIR}/bin:${PATH}"
pnpm install --frozen-lockfile

log "editor-ui が使うパッケージをビルドします"
pnpm --filter 'n8n-editor-ui^...' build

log "editor-ui をビルドします"
(cd packages/frontend/editor-ui && N8N_DEFAULT_LOCALE=ja pnpm build)

DIST_DIR="${SRC_DIR}/packages/frontend/editor-ui/dist"
[ -f "${DIST_DIR}/index.html" ] || die "ビルド結果に index.html がありません: ${DIST_DIR}"

log "配置します: ${DEPLOY_DIR}"
rm -rf "$DEPLOY_DIR"
mkdir -p "$(dirname "$DEPLOY_DIR")"
cp -R "$DIST_DIR" "$DEPLOY_DIR"
[ -f "${DEPLOY_DIR}/index.html" ] || die "配置先に index.html がありません: ${DEPLOY_DIR}"

log "完了しました。n8n を再起動すると反映されます"
