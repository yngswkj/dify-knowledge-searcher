# Difyナレッジ検索テスター

Electron版のDify Knowledge Retrieve API比較ツールです。

## 使い方

```powershell
cd C:\Users\yngsw\dev\dify-knowledge-searcher
npm install
npm start
```

PowerShellのnpm shimで実行できない場合は、`npm` の代わりに `& 'C:\Program Files\nodejs\npm.cmd'` を使ってください。

## EXE生成

```powershell
cd C:\Users\yngsw\dev\dify-knowledge-searcher
npm run dist
```

生成物:

- `dist\Dify-Knowledge-Search-Tester-0.1.0-x64.exe`

`dist/` は生成物なのでGitHubには含めません。配布する場合はGitHub Releasesなどに置いてください。

## 構成

- `index.html`: UI本体
- `main.cjs`: ElectronウィンドウとDify API代理呼び出し
- `preload.cjs`: Rendererへ公開する最小API
- `scripts/check-index.cjs`: HTML内スクリプトの構文チェック
- `scripts/serve.cjs`: ブラウザ確認用の簡易ローカルサーバー

## 保存データ

Base URL、APIキー、Dataset ID、クエリ、検索設定はアプリ内のlocalStorageに保存します。APIキーは暗号化されません。

Retrieve APIはElectronのmain processから呼び出すため、通常のブラウザCORS制約を受けません。
