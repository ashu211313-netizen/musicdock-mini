# MusicDock Mini v2.0.2

YouTube Musicを小さなDocument Picture-in-Pictureウィンドウで操作する非公式のManifest V3拡張機能です。Windowsのデスクトップ版Chrome / Edgeを対象としています。

- Web: https://ashu211313-netizen.github.io/musicdock-mini/
- Release: https://github.com/ashu211313-netizen/musicdock-mini/releases
- 問い合わせ: https://github.com/ashu211313-netizen/musicdock-mini/issues

## 使い方

最新版ZIPを展開し、chrome://extensions または edge://extensions からmanifest.jsonのあるフォルダを読み込みます。YouTube Musicタブを更新し「♫ MINI」をクリック。更新後は拡張機能詳細が2.0.2であることを確認してください。旧版との二重読み込みを避けてください。

元のタブは開いたままにします。最前面・移動・サイズ変更・標準タイトルバーはブラウザのPiP機能を使用します。ブラウザ標準UIを削除する処理はありません。

## 同期と安全な操作

再生時計はYouTube Musicの再生バーから取得します。音声操作の対象は時刻・長さが合う一意のnative mediaに限定。曲が切り替わるときはソース更新と安定期間を確認し、シーク中に曲が変わった場合は操作を拒否します。確認できない間は操作を無効化します。古いvideoの数値へはフォールバックしません。

詳細: [同期監査](docs/SYNC-AUDIT.md) / [導入ガイド](docs/INSTALL.md) / [プライバシー](docs/PRIVACY.md) / [変更履歴](CHANGELOG.md)

## 開発

Node.js 24、npmを使用します。

```sh
npm ci
npx playwright install chromium
npm run check
```

`npm run check` は型検査、単体テスト、ビルド、Windows PowerShellでのZIP生成、Playwrightを実行します。`npm run dev` でローカルサイトを表示します。テスト用サーバーは空いているポートを使用して終了時に停止します。

apps/extensionが拡張機能、apps/websiteが紹介・導入・接続なしデモの静的Webサイトです。Web単体で別タブのYouTube Musicを操作する構成ではありません。

## 公開

既存mainの更新でPagesワークフローを実行します。成功時に、その実行で検証した同一ZIPとSHA256をReleaseワークフローへ渡して登録します。パッケージ、manifest、サイト、導入ガイドのバージョンはビルドで照合します。

## 確認範囲と制限

自動テストは生成した無音WAVとテスト用DOMを使います。実YouTube MusicのDOM・時計の丸め差は確認していますが、ユーザーのChromeへ本拡張機能を読み込んだ実サービスの受け入れ確認、Windows/Edgeの最前面・手動リサイズ認証は未完了です。

370×240、320×220、270×195以下の配置と、テストブラウザで測定した244×57の超小型配置を検証しています。最小サイズはOS・ブラウザごとに異なります。DOMは公式安定APIではなく、変更時は操作が制限される可能性があります。

Google / YouTubeとの提携・承認関係はありません。提供素材の権利・配布条件はLICENSEを参照。ストアは未申請です。
