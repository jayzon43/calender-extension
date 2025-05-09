#!/bin/bash

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# 仮想環境が存在しない場合は作成
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Python仮想環境を有効化
source venv/bin/activate

# 必要なパッケージをインストール
pip install -r requirements.txt python-multipart

# サーバーを起動
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 
