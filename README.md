# MusicDock Mini (仮称)

YouTube Music用の非公式ミニプレイヤー。Windows 10/11のデスクトップ版Chrome / Edgeを対象としたManifest V3拡張機能です。提供されたYTM Mini - Simple PlayerのセレクタとPiP方式を再利用しています。

**状態: ローカルプレビュー版。GitHub / Pages / Releases / ストアは未公開。実YouTube Musicセッションでの受け入れ確認は未実施。**

## 使い方
[導入ガイド](docs/INSTALL.md)を参照。dist/musicdock-mini-1.1.0.zipを展開し、拡張機能管理画面から読み込みます。YouTube Musicを更新し「♫ MINI」をクリック。元タブは開いたままにしてください。

## 開発
Node.js 24以上、npm。ロックファイルは同梱しています。

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run package
npx playwright install chromium
npm run test:browser
```

Windowsでパッケージ化: `powershell -File scripts/package.ps1`。ビルドをやり直すとZIPは消えるため、最後にパッケージ化してください。`npm run dev` で http://127.0.0.1:8765/dist/website/ を表示。

## 構成
- apps/extension: TypeScriptソース、Manifest、アイコン
- apps/website: フレームワーク不要の静的サイト、接続しない操作デモ
- tests: アダプター単体テスト、ブラウザ・拡張機能モックテスト
- scripts: esbuild、ローカルサーバー、ZIP生成
- docs: 監査・導入・プライバシー・申請準備・検証結果
- dist: 拡張機能、静的サイト、ZIP、SHA256

## 公開手順（未実施）
1. プロトタイプ・アイコンの権利とプロダクト名を確認。
2. 新しいGitHubリポジトリにこのソースを登録。node_modules/distはコミットしない。
3. Settings → Pages → SourceをGitHub Actionsに設定。
4. mainへpushするとpages.ymlが検証・ビルド・Pages配信。実URLでダウンロードとリンクを確認。
5. `v1.1.0` タグをpushするとrelease.ymlがZIPとハッシュをGitHub Releasesへ登録。
6. サイトのプライバシー説明に連絡先を追加、ストア申請準備を完了。

利用可能なGitHubコネクターに新規repo/Pages/Release操作はありません。GitHub作成画面へのブラウザアクセスは承認ゲートで拒否されたため、回避経路で公開していません。

ローカルのmainブランチに実装をコミットしています。外部リモートは未設定です。

## 制限
DOMはYouTube Musicの非公式インターフェースで変更される可能性があります。ブラウザ標準のPiPで最前面・移動・サイズ変更を実現し、位置をプログラムで指定しません。メディアがシーク可能なときだけシークします。サイズ保存・テーマ切替は未実装。元タブ終了後は利用不可。Chrome/Edge・OS上での実機確認は別途必要です。

[監査](docs/AUDIT.md) / [プライバシー](docs/PRIVACY.md) / [ストア準備](docs/STORE.md) / [検証結果](docs/TEST-RESULTS.md)

Google / YouTubeとは提携・承認関係はありません。再配布ライセンスは未確定です。LICENSEを参照。
