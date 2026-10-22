# Chrome Web Store申請準備

申請状態: 未申請。ストアURL、公開プライバシーURLは未取得。

表示名: MusicDock Mini (仮称)
短い説明: YouTube Musicを、小さな最前面ウィンドウで操作する非公式ミニプレイヤー。
詳細説明: 曲名、アーティスト、ジャケット、再生時間を見ながら、再生・一時停止、前後の曲、シーク、音量・ミュートを操作できます。最新のデスクトップ版Chrome / Edgeで、YouTube Musicの「♫ MINI」から起動してください。元タブは開いたままにしてください。DOM変更等で操作できなくなる場合があります。Google / YouTubeと提携・承認関係はありません。広告や再生制限を変更せず、音声のダウンロード機能はありません。

単一用途: YouTube Musicの再生状態を小窓に表示し、利用者の再生操作を補助する。
権限理由: permissions/host_permissionsは追加していません。content_scriptsのmusic.youtube.com限定アクセスは、表示中の曲情報取得とボタン操作に必要です。
リモートコード: なし。eval、外部スクリプトなし。
申請ZIP: dist/musicdock-mini-1.1.0.zip
アイコン: apps/extension/icons/ の16/48/128px。権利確認後使用。

申請前チェック:
- [ ] 提供プロトタイプとアイコンの再配布権を確認
- [ ] 名称の商標・混同調査と最終名称確定
- [ ] ユーザーの実セッションで必須機能を確認し、正規の実画面スクリーンショットを取得
- [ ] 1280×800 または640×400の掲載用スクリーンショットを用意。モックを実動作の証拠として使用しない
- [ ] 必須の440×280小型プロモーション画像を用意
- [ ] docs/PRIVACY.md相当の公開HTTPSページURLと連絡先を確定
- [ ] デベロッパー登録、必要な費用・本人確認をユーザーが実施
- [ ] ダッシュボードのプライバシー申告、単一用途、データ取扱いを実装と照合
- [ ] 最新のポリシー・ブランド規定・利用規約を再確認し申請、審査完了後にURLを更新

参照（2026-10-23確認）:
- https://developer.chrome.com/docs/webstore/program-policies/policies/
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/web-platform/document-picture-in-picture
- https://wicg.github.io/document-picture-in-picture/
- https://www.youtube.com/static?template=terms
- https://brand.youtube/

規約やストア審査への適合を保証するものではありません。利用者の手動操作のみで、広告・DRM・ログイン・課金制限を回避しません。
