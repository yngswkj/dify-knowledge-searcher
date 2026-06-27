# CLAUDE.md

Difyナレッジ検索テスター（Electronデスクトップアプリ）。
Dify Knowledge Retrieve API の検索設定を比較・テストするツール。

## Commands

```bash
npm start          # Electronアプリ起動（electron .）
npm run check      # main.cjs/preload.cjs の構文 + index.html内スクリプト構文チェック
npm run serve      # ブラウザ確認用の静的サーバ（http://127.0.0.1:4179）
npm run dist       # checkを通してから Windows portable EXE を生成（dist/）
```

PowerShellで `npm` shimが動かない場合は `& 'C:\Program Files\nodejs\npm.cmd'` を使う。

## Architecture

- `index.html`: マークアップのみ（~88行）。CSSとrendererエントリを `<link>` / `<script type="module">` で外部参照
- `styles/app.css`: UIスタイル
- `src/renderer/*.mjs`: rendererのESモジュール群（エントリは `main.mjs`）
  - `config.mjs`: 定数（STORAGE_KEY / MAX_QUERY_LENGTH / DEFAULT_BASE_URL）
  - `utils.mjs`: 純粋ヘルパ（uid / clamp / escape / groupBy ほか）
  - `dom.mjs`: `elements`（DOM参照シングルトン）+ DOM生成ヘルパ
  - `preset-model.mjs`: `defaultPreset` / `sanitizePreset` / `buildRetrievalModel`
  - `state.mjs`: `state` / `runState` / `uiState`（共有シングルトン）+ `loadState` / `saveState`。`uiState` は結果表の選択行・並べ替え・絞り込み（非永続）
  - `metrics.mjs`: 組み合わせの自動指標（`combTop` / `combAvg` / `combDocs`）。正解判定不要
  - `render.mjs`: 全レンダリング。結果は**評価ワークベンチ**＝比較表（クエリ×設定をソート/フィルタ可能な行で一覧、`renderComboTable`）＋詳細ペイン（選択行のチャンクを `chunk-*` アコーディオンで表示、`renderDetail`）
  - `api.mjs`: `runAll` ほか通信・実行制御（IPC `dify:retrieve` 経由）
  - `presets.mjs`: プリセット入力/クリックのハンドラ
  - `main.mjs`: エントリ。`init()` / `bindEvents()`
- `main.cjs`: Electron main。`dify:retrieve` / `dify:cancel` のIPCハンドラでDify APIを代理呼び出し
- `preload.cjs`: `contextBridge` で `window.difyDesktop.{retrieve,cancel}` のみ公開
- `scripts/check-renderer.cjs`: `src/renderer` 配下のJSを `node --check` で構文検証
- `scripts/serve.cjs`: UIプレビュー用の簡易静的サーバ（port 4179、`.mjs` 配信対応）

> モジュール分割の方針: `state` / `runState` / `elements` はエクスポートされたシングルトン。各モジュールは**プロパティを変更**するだけで束縛は再代入しない（ESMのlive bindingを壊さないため）。依存は config/utils/dom → preset-model → state → render → api/presets → main の一方向で循環なし。

> EXEに含めるファイルは `package.json` の `build.files`（`index.html` / `styles/**` / `src/**` / `*.cjs`）で管理。rendererに新ディレクトリを足したら忘れず追加する。

## Gotchas

- Retrieve APIは**main processから`fetch`するためブラウザのCORS制約を受けない**（rendererから直接叩かない）
- Base URL・APIキー・Dataset ID・クエリ・検索設定は**localStorageに平文保存**（APIキー非暗号化）
- `npm run check` はlint/型チェックではなく構文チェックのみ。テストスイートは無し
- renderer（`src/renderer/`）やCSSを編集したら `npm run check` で構文確認する

## PM2 Services

| Port | Name | Type |
|------|------|------|
| 4179 | dify-knowledge-searcher-4179 | Node (静的HTTPサーバ / scripts/serve.cjs) |

> Note: Electron本体（`npm start` = `electron .`）はGUIアプリのためPM2対象外。PM2で管理するのはUIプレビュー用の静的サーバのみ。

**Terminal Commands:**
```bash
pm2 start ecosystem.config.cjs   # First time
pm2 start all                    # After first time
pm2 stop all / pm2 restart all
pm2 start dify-knowledge-searcher-4179 / pm2 stop dify-knowledge-searcher-4179
pm2 logs / pm2 status / pm2 monit
pm2 save                         # Save process list
pm2 resurrect                    # Restore saved list
```
