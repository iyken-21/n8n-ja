// editor-ui のビルド済みファイルに当てるパッチ。
// 各パッチは対象ファイルを内容で特定し、置換箇所がちょうど1か所であることを確かめてから書き換える。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const UI_LOCALE_STORAGE_KEY = 'n8n-ui-locale';

const isAppBundle = (name, content) => name.startsWith('app-') && content.includes('var ja_default = {');
const isPersonalSettings = (name) => name.startsWith('SettingsPersonalView-') && name.endsWith('.js');

function replaceOnce(content, search, replacement, patchName) {
	const count = content.split(search).length - 1;
	if (count !== 1) throw new Error(`${patchName}: 置換箇所が ${count} 件見つかりました（1 件のはず）: ${search}`);
	return content.replace(search, () => replacement);
}

// i18n/ja-extra.json の訳を ja_default の末尾に追記する。同じキーは後勝ちになるため、既存の訳も上書きできる
function jaExtra(root) {
	const extra = JSON.parse(readFileSync(join(root, 'i18n', 'ja-extra.json'), 'utf8'));
	return {
		name: 'ja-extra',
		match: isAppBundle,
		apply(content) {
			const lines = content.split('\n');
			const headerIndex = lines.indexOf('var ja_default = {');
			const closeIndex = lines.indexOf('};', headerIndex);
			if (closeIndex === -1) throw new Error('ja-extra: ja_default の終わりが見つかりません');
			// 直前のプロパティ行は末尾カンマがないため、各行の先頭にカンマを付ける
			const block = Object.entries(extra).map(([key, value]) => `\t,${JSON.stringify(key)}: ${JSON.stringify(value)}`);
			return [...lines.slice(0, closeIndex), ...block, ...lines.slice(closeIndex)].join('\n');
		},
	};
}

// サーバーの既定言語（N8N_DEFAULT_LOCALE）より、ブラウザに保存した言語を優先する
const localeOverride = {
	name: 'locale-override',
	match: isAppBundle,
	apply: (content) =>
		replaceOnce(
			content,
			'state.value.defaultLocale = value;',
			`state.value.defaultLocale = (() => { try { return localStorage.getItem(${JSON.stringify(UI_LOCALE_STORAGE_KEY)}); } catch { return null; } })() ?? value;`,
			'locale-override',
		),
};

// 個人設定の「パーソナライズ」にテーマと並べて言語の選択欄を追加する
const localeSelect = {
	name: 'locale-select',
	match: isPersonalSettings,
	apply(content) {
		const withHandler = replaceOnce(
			content,
			'uiStore.setTheme(item.value);\n\t\t}\n',
			`uiStore.setTheme(item.value);
		}
		const uiLocaleItems = [{ value: "ja", label: "日本語" }, { value: "en", label: "English" }];
		const uiLocaleTitle = i18n.locale === "ja" ? "言語" : "Language";
		const uiLocaleDescription = i18n.locale === "ja" ? "このブラウザでの表示言語です。変更するとページを再読み込みします。" : "Display language in this browser. The page reloads after changing it.";
		function onUiLocaleChange(value) {
			if (value === i18n.locale) return;
			try {
				localStorage.setItem(${JSON.stringify(UI_LOCALE_STORAGE_KEY)}, value);
			} catch (e) {
				showError(e, uiLocaleTitle);
				return;
			}
			location.reload();
		}
`,
			'locale-select',
		);
		return replaceOnce(
			withHandler,
			'}, 8, ["title", "description"])]),',
			`}, 8, ["title", "description"]), createVNode(unref(SettingsRow_default), {
								title: uiLocaleTitle,
								description: uiLocaleDescription
							}, {
								action: withCtx(() => [createVNode(unref(Select_default), {
									"model-value": unref(i18n).locale,
									items: uiLocaleItems,
									size: "medium",
									"aria-label": uiLocaleTitle,
									"data-test-id": "ui-locale-select",
									"onUpdate:modelValue": onUiLocaleChange
								}, null, 8, ["model-value", "aria-label"])]),
								_: 1
							}, 8, ["title", "description"])]),`,
			'locale-select',
		);
	},
};

export const createPatches = (root) => [jaExtra(root), localeOverride, localeSelect];
