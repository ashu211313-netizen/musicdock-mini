# Typography — v2.0.2

曲名を主役にし、アーティスト、時刻、ブランドの順に視覚的な強さを下げる。レイアウトと再生・同期処理を維持する。

| 要素 | 370×240 | 320×220 | 270×195 |
| --- | --- | --- | --- |
| 曲名 | 18px / 580 / 26px | 17px / 580 / 25px | 16px / 580 / 24px |
| アーティスト | 12.5px / 450 / 20px | 12px / 450 / 19px | 12px / 450 / 18px |
| 時刻 | 11px / 500 / 12px | 11px / 500 / 12px | 10px / 500 / 12px |

曲名の字間は−0.018em。日本語の濁点や欧文の上下端のため行高を確保。曲名とアーティストの間は4px（小型3/2px）。ブランドをタイトルケース、10px / 550、字間0.035emへ変更。通常の再生状態を重複して文字表示しない。

Inter 4.1の公式未改変InterVariable.woff2（352,240 bytes）を使用。配布元 https://github.com/rsms/inter/releases/tag/v4.1 。SIL Open Font License 1.1の全文をfonts/OFL.txtと配布ZIPのInter-OFL.txtに収録する。esbuild binary loaderでフォントをバイト列としてJSに埋め込み、Document PiPのFontFaceSetへ登録する。フォントURL、外部通信、OSへのインストール、追加拡張権限は不要。読込失敗時は日本語フォールバックで表示を継続する。

欧文はInter、日本語はYu Gothic UI、続いてMeiryo。font-synthesis:noneで不自然な擬似ウェイトを避ける。時刻はlining-nums tabular-numsを明示する。

長文はmin-width:0、max-width:100%、nowrap、ellipsisを維持。全文はtitle属性のツールチップで確認できる。自動横スクロールは使用しない。極小サイズでは既存の横一列レイアウトを保持し、文字だけ段階的に縮小する。

2026-10-24 Windows上のインストール済みChrome 154.0.8037.100で本番レンダラーをheadless描画。CDPが欧文Inter Variable（custom font）、日本語Yu Gothic UI Semiboldの実使用を確認した。370×240、320×220、270×195、244×57の通常・長文と改修前後を同じ条件で撮影。4種類の時刻の幅が一致し、フォントHTTPリクエストは0件。Chrome for Testingでも同じ検証を実施。

実際のDocument PiPをresizeTo(1,1)したChrome for Testingの観測内寸は244×57。横・縦スクロールなし。これはインストール済みChromeの手動リサイズによる最小サイズ認定ではない。ユーザープロファイルに拡張機能を入れた実YouTube Musicの受け入れ検証、手動最前面検証は未実施。

再生同期アダプターはv2.0.1から差分なし。型チェック、30単体テスト、6 Playwrightテスト（実PiPライフサイクル、旧メディア誤同期回帰、既存操作、文字描画）で回帰を検査する。
