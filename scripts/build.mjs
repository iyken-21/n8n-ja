// Tomatio13/n8n-i18n-japanese のリリース（日本語版 editor-ui）を取得し、scripts/patches.mjs のパッチを当てて editor-ui-ja/ に出力する。
// 毎回リリースの元ファイルから作り直すため、何度実行しても同じ結果になる。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPatches } from './patches.mjs';

// compose.yml の n8n イメージと同じバージョンにすること
const N8N_VERSION = '2.45.4';
const RELEASE_SHA256 = '0ca077591a704f810f123a443582d7e0866f5cf5afd49fbc779ab2fb129bdec8';
const RELEASE_URL = `https://github.com/Tomatio13/n8n-i18n-japanese/releases/download/n8n%40${N8N_VERSION}/editor-ui.tar.gz`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'editor-ui-ja');
const cacheDir = join(root, '.cache');
const manifestName = '.renames.json';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

async function fetchRelease() {
	const tarball = join(cacheDir, `editor-ui-${N8N_VERSION}.tar.gz`);
	if (!existsSync(tarball)) {
		mkdirSync(cacheDir, { recursive: true });
		const response = await fetch(RELEASE_URL);
		if (!response.ok) throw new Error(`ダウンロードに失敗しました（${response.status}）: ${RELEASE_URL}`);
		writeFileSync(tarball, Buffer.from(await response.arrayBuffer()));
	}
	const actual = sha256(readFileSync(tarball));
	if (actual !== RELEASE_SHA256) {
		rmSync(tarball);
		throw new Error(`リリースのハッシュが一致しません（期待値 ${RELEASE_SHA256}、実際 ${actual}）`);
	}
	return tarball;
}

function readManifest() {
	const path = join(outDir, manifestName);
	return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

const stubFor = (target, content) =>
	`export * from './${target}';\n${/export \{[^}]*\bas default\b[^}]*\};?\s*$/.test(content) ? `export { default } from './${target}';\n` : ''}`;

function build(distDir) {
	const assetsDir = join(distDir, 'assets');
	const patches = createPatches(root);
	const files = readdirSync(assetsDir).filter((name) => name.endsWith('.js'));

	const patched = files.flatMap((name) => {
		const original = readFileSync(join(assetsDir, name), 'utf8');
		const applicable = patches.filter((patch) => patch.match(name, original));
		if (applicable.length === 0) return [];
		const content = applicable.reduce((acc, patch) => patch.apply(acc), original);
		return [{ name, content, applied: applicable.map((patch) => patch.name) }];
	});
	const missing = patches.filter((patch) => !patched.some((file) => file.applied.includes(patch.name)));
	if (missing.length > 0) throw new Error(`対象ファイルが見つからないパッチがあります: ${missing.map((p) => p.name).join(', ')}`);

	// ブラウザのキャッシュ（max-age=86400）を避けるため、パッチを当てたファイルは内容のハッシュで名前を変える。
	// app は他のファイルから参照されるため最後に処理する
	const ordered = [...patched].sort((a, b) => Number(a.name.startsWith('app-')) - Number(b.name.startsWith('app-')));
	const textFiles = () => [
		join(distDir, 'index.html'),
		...readdirSync(assetsDir)
			.filter((name) => /\.(js|css|html)$/.test(name))
			.map((name) => join(assetsDir, name)),
	];
	for (const { name, content } of ordered) writeFileSync(join(assetsDir, name), content);
	const renames = ordered.map(({ name }) => {
		// 先に処理したファイルの名前変更で参照が書き換わっているため、ディスクから読み直す
		const content = readFileSync(join(assetsDir, name), 'utf8');
		const prefix = name.slice(0, name.lastIndexOf('-'));
		const renamed = `${prefix}-${createHash('sha256').update(content).digest('base64url').slice(0, 8)}.js`;
		writeFileSync(join(assetsDir, renamed), content);
		for (const path of textFiles()) {
			const text = readFileSync(path, 'utf8');
			if (text.includes(name)) writeFileSync(path, text.replaceAll(name, renamed));
		}
		// キャッシュに残った古いファイルが元の名前を import しても、同じモジュールを参照するよう中継ファイルにする
		writeFileSync(join(assetsDir, name), stubFor(renamed, content));
		return { name, renamed, content };
	});

	// 以前のビルドで付けた名前も、キャッシュから参照されうるため中継ファイルとして残す
	const previous = readManifest();
	const manifest = Object.fromEntries(
		renames.map(({ name, renamed, content }) => {
			const history = (previous[name] ?? []).filter((old) => old !== renamed);
			for (const old of history) writeFileSync(join(assetsDir, old), stubFor(renamed, content));
			return [name, [...history, renamed]];
		}),
	);
	writeFileSync(join(distDir, manifestName), `${JSON.stringify(manifest, null, '\t')}\n`);
	return renames;
}

const tarball = await fetchRelease();
const workDir = mkdtempSync(join(cacheDir, 'build-'));
try {
	execFileSync('tar', ['xzf', tarball, '-C', workDir]);
	const distDir = join(workDir, 'dist');
	const renames = build(distDir);
	// compose でディレクトリごとマウントしているため、ディレクトリ自体は残して中身だけ入れ替える
	mkdirSync(outDir, { recursive: true });
	for (const name of readdirSync(outDir)) rmSync(join(outDir, name), { recursive: true, force: true });
	cpSync(distDir, outDir, { recursive: true });
	for (const { name, renamed } of renames) console.log(`${name} -> ${renamed}`);
	console.log(`editor-ui-ja/ を作成しました（n8n ${N8N_VERSION}）。反映するには n8n を再起動してください`);
} finally {
	rmSync(workDir, { recursive: true, force: true });
}
