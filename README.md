# Todo Calendar

テキストからタスクを抽出してGoogle Calendarに登録するChrome拡張機能

## 機能

- ウェブページ上のテキストからタスク情報を抽出
- 自動でGoogle Calendarに予定を追加
- オレンジ色でカレンダーに表示
- デフォルトで30分の予定として登録

## インストール手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/[your-username]/todo_calendar
cd todo_calendar
```

### 2. バックエンド環境のセットアップ

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. バックエンドサーバーの起動

```bash
cd backend
python3 -m uvicorn main:app --reload
```

### 4. Chrome拡張機能のインストール

1. Chromeで`chrome://extensions/`を開く
2. 右上の「デベロッパーモード」をオン
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `extension`フォルダーを選択

### 5. APIキーの設定

1. ブラウザで`http://localhost:8000/setup`にアクセス
2. 画面の指示に従ってOpenAI APIキーとGoogle Cloud認証情報を設定

## 使い方

1. バックエンドサーバーが起動していることを確認
2. ウェブページ上でテキストを選択
3. 右クリックして「タスクを抽出」を選択
4. Google Calendarに自動で予定が追加されます

## 注意事項

- 初回使用時はGoogleアカウントの認証が必要です
- バックエンドサーバーが起動している必要があります
- テキストは日本語でも英語でも解析可能です

## トラブルシューティング

### サーバーが起動しない場合

ポートが使用中の場合は以下のコマンドで確認：

```bash
lsof -i :8000
```

使用中のプロセスを終了：

```bash
kill [PID]
```

## プロジェクト構造

```
todo_calendar/
├── backend/                     # バックエンドコード
│   ├── main.py                  # FastAPIアプリケーション
│   ├── requirements.txt         # Pythonライブラリ依存関係
│   └── services/                # サービスモジュール
│       ├── text_analyzer.py     # テキスト解析モジュール
│       └── calendar_service.py  # Google Calendar連携モジュール
└── extension/                   # Chrome拡張機能
    ├── manifest.json            # 拡張機能マニフェスト
    ├── css/                     # スタイルシート
    │   └── popup.css            # ポップアップのスタイル
    ├── html/                    # HTMLファイル
    │   └── popup.html          # ポップアップのHTML
    ├── js/                      # JavaScriptファイル
    │   ├── background.js        # バックグラウンドスクリプト
    │   ├── content.js           # コンテンツスクリプト
    │   └── popup.js             # ポップアップのスクリプト
    └── images/                  # アイコンなどの画像ファイル
```

## ライセンス

MIT License 
# calender-extension
# calender-extension
