# PTCG AI Battle Rating Lab — Chrome Extension

[The Pokémon Company - PTCG AI Battle Challenge Simulation](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle) の最新2提出を比較する、ローカルインストール型の非公式Chrome拡張です。

## インストール

1. KaggleにログインしているChromeで `chrome://extensions` を開きます。
2. 「デベロッパー モード」を有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」を押します。
4. この `ChromeExtension` フォルダを選択します。
5. [コンペの提出ページ](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle/submissions)を再読み込みします。
6. 右下の `Rating Lab` を押します。

Python、Node.js、Playwright、MySQL、`auth.json`、Kaggle API tokenは不要です。

## 動作

- 最新2件を `Submission #1` / `Submission #2` として表示します。
- 自分のteam IDとLeaderboardを動的に照合し、現在のチーム順位、メダル圏、次のボーダーまでのレート差を表示します。
- 初回はコンペ、提出2件のepisode、Leaderboardを順番に取得します。
- レート推移、勝敗、平均値、メダルボーダー、ランキング分布を表示します。
- 取得結果は `chrome.storage.local` にキャッシュします。
- 再取得は右上の更新ボタンを押したときだけ行います。
- Kaggleの仕様により、episodeが1,000件までしか返らない場合があります。

詳細、プライバシー、制限事項、トラブルシューティングは[ルートREADME](../README.md)を参照してください。

> KaggleおよびThe Pokémon Companyの公式ツールではありません。
