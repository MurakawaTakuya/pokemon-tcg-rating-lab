# PTCG AI Battle Rating Lab

<img width="500" alt="image" src="https://github.com/user-attachments/assets/9a1c3d3e-6c2b-4e2a-b77a-bb37f4fb7bd7" />

[The Pokémon Company - PTCG AI Battle Challenge Simulation](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle) のレート推移を、Kaggleのコンペ画面上で確認するための非公式Chrome拡張です。

最新2件の提出を比較し、試合ごとのレート推移、勝敗、平均レート、メダルボーダー、ランキング分布をサイドパネルにまとめて表示します。

![Chrome](https://img.shields.io/badge/Chrome-111%2B-4285F4?logo=googlechrome&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-V3-7C3AED)
![License](https://img.shields.io/badge/license-MIT-green)

> [!IMPORTANT]
> KaggleおよびThe Pokémon Companyの公式ツールではありません。KaggleのWeb内部APIを利用しているため、Kaggle側の変更によって動作しなくなる可能性があります。

## 主な機能

- 最新2件の提出を `Submission #1` と `Submission #2` として匿名表示
- ログイン中ユーザーの現在のチーム順位、Leaderboard score、メダル圏
- 次のメダルボーダーまでに必要なレート差
- 各提出の現在レート、勝敗数、平均値、最小値、最大値
- 最大1,000試合分のレート推移グラフ
- Gold / Silver / Bronzeの現在のボーダー
- 現在のランキングにおけるレート分布
- 分布ホバー時の人数、レート帯、順位範囲
- グラフホバー時の試合番号、レート、増減、勝敗
- 自分の提出周辺を見る `Focus` と、ランキング全体を見る `All`
- パネル外クリックまたは右上の×ボタンで閉じる
- 取得結果のローカルキャッシュと手動更新

## 必要なもの

- Google Chrome 111以降
- Kaggleにログイン済みのChromeプロファイル
- 対象コンペへの参加
- 評価済みの提出が2件以上

Python、Node.js、Playwright、MySQL、`auth.json`、Kaggle API tokenは不要です。

## インストール

1. リポジトリをcloneします。

   ```bash
   git clone https://github.com/MurakawaTakuya/pokemon-tcg-rating-lab.git
   cd pokemon-tcg-rating-lab
   ```

2. Chromeで `chrome://extensions` を開きます。
3. 右上の「デベロッパー モード」を有効にします。
4. 「パッケージ化されていない拡張機能を読み込む」を押します。
5. このリポジトリの `ChromeExtension` フォルダを選択します。
6. Kaggleへログインして、対象コンペのページを再読み込みします。

## 使い方

1. [PTCG AI Battleの提出ページ](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle/submissions)を開きます。
2. 右下に表示される `Rating Lab` を押します。
3. 初回取得が終わるまで待ちます。
4. 必要に応じて右上の更新ボタンを押します。

`Submission #1` が最新の提出、`Submission #2` がその1つ前の提出です。実際のsubmission IDは画面に表示しません。

左端の `Your rank` は、対象コンペで取得した自分のteam IDと現在のLeaderboardを動的に照合したチーム順位です。現在のメダル圏と、次のメダルボーダーまでに必要なレート差も表示します。team IDとteam名は画面に表示しません。

### Focus / All

- `Focus`: 最新2件のレート推移とメダルボーダーが見やすい範囲を表示します。
- `All`: 取得済みのランキング全体が収まるレート範囲を表示します。

切り替え時にKaggleへ追加リクエストは送りません。

### ホバー表示

- レートグラフ: その試合付近における両提出のレート、直前からの増減、勝敗、episode ID
- ランキング分布: レート帯、該当チーム数、順位範囲

## データ取得とキャッシュ

キャッシュがない状態でパネルを初めて開くと、次の5リクエストを順番に実行します。

1. 参加コンペ一覧
2. 自分の提出一覧
3. `Submission #1` のepisode一覧
4. `Submission #2` のepisode一覧
5. 現在の公開Leaderboard

取得結果は `chrome.storage.local` に保存されます。通常のパネル開閉、`Focus` / `All` の切り替え、グラフ操作では追加取得しません。再取得は右上の更新ボタンを押したときだけ行います。

### Fetched matches

`Fetched matches` はKaggleから実際に取得できたrated episode数です。

現在のKaggleレスポンスでは、各提出が1,000試合を超えていても1,000件までしか返らない場合があります。この場合、グラフ、勝敗数、平均値、最小値、最大値は取得できた1,000件を対象にします。

## プライバシーと権限

拡張機能が要求するChrome権限は `storage` のみです。

- Kaggleへログイン済みの現在のタブを利用します。
- KaggleのCookieや認証情報を外部サーバーへ送信しません。
- KaggleのCookieや認証情報をChromeのストレージへ保存しません。
- レート、勝敗、提出メタデータ、Leaderboardをローカルにキャッシュします。
- 外部の解析サービスや広告サービスへ通信しません。

表示上はsubmission IDを `Submission #1` / `Submission #2` に置き換えています。ただし提出ファイル名、レート、勝敗数、episode IDは表示されます。スクリーンショットを公開する場合は、コンペ開催中の戦略情報が含まれていないか確認してください。

## 更新方法

```bash
git pull
```

その後、`chrome://extensions` でこの拡張機能の再読み込みボタンを押し、Kaggleページも再読み込みします。

## トラブルシューティング

### Rating Labボタンが表示されない

- URLが `https://www.kaggle.com/competitions/pokemon-tcg-ai-battle/...` であることを確認してください。
- `chrome://extensions` で拡張機能が有効になっているか確認してください。
- 拡張機能を再読み込みしてからKaggleページを更新してください。

### 認証エラーまたはデータが空になる

- 拡張機能を入れたChromeプロファイルでKaggleへログインしてください。
- 対象コンペへ参加済みか確認してください。
- Kaggleページを再読み込みしてから更新ボタンを押してください。

### 最新の表示変更が反映されない

1. `chrome://extensions` で拡張機能を再読み込みします。
2. Kaggleページを再読み込みします。
3. パネル右上の更新ボタンを押します。

### 2件比較が表示されない

この拡張機能は評価済みの提出を最低2件必要とします。Kaggle側の評価完了後に更新してください。

## 構成

```text
ChromeExtension/
├── manifest.json  # Manifest V3設定
├── bridge.js      # ログイン済みKaggleタブから同一オリジンAPIを呼び出す
├── content.js     # サイドパネル、取得処理、グラフ描画
└── README.md      # 拡張機能単体のインストール案内
```

ビルド工程はありません。Chromeが `ChromeExtension` 内のファイルを直接読み込みます。

このリポジトリにはベースプロジェクト由来の `Backend`、`Frontend`、`Database` も残っていますが、このChrome拡張の利用には必要ありません。

## 制限事項

- PTCG AI Battle Challenge向けに開発・確認しています。
- Kaggleの非公開Web API仕様に依存しています。
- episode取得が1,000件で打ち切られる場合があります。
- メダルボーダーとランキング分布は現在の公開Leaderboardを基準にします。
- 勝敗はepisode内のrewardを比較して算出します。
- Kaggleのレート制限を避けるため、自動更新や連続更新は行いません。

利用時は[Kaggle Terms of Use](https://www.kaggle.com/terms)および対象コンペのルールに従ってください。

## クレジット

このリポジトリは [AsutoshaNanda/kaggle-replays](https://github.com/AsutoshaNanda/kaggle-replays) をベースにしています。Chrome拡張とPTCG向けレート表示を追加しています。

## License

[MIT License](LICENSE)
