import os
import json
import logging
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# 環境変数をロード
load_dotenv()

# ロギングの設定
logger = logging.getLogger(__name__)

class TextAnalyzer:
    def __init__(self):
        # OpenAI APIキーを環境変数から取得
        self.api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("APIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。")
        
        # APIキーの形式を検証
        if not (self.api_key.startswith("sk-") or self.api_key.startswith("sk-proj-")):
            raise ValueError("無効なAPIキー形式です。APIキーはsk-またはsk-proj-で始まる必要があります。")
        
    def extract_task(self, text):
        """
        テキストからタスク情報を抽出する
        
        Args:
            text (str): 解析するテキスト
            
        Returns:
            dict: 抽出されたタスク情報
        
        Raises:
            ValueError: APIキーが無効な場合や、APIリクエストに失敗した場合
            requests.exceptions.RequestException: ネットワークエラーが発生した場合
        """
        try:
            # プロンプトの作成
            prompt = f"""
            以下のテキストからタスク情報を抽出し、JSON形式で返してください。
            抽出すべき情報:
            - タスクのタイトル
            - 開始日時（ISO 8601形式: YYYY-MM-DDTHH:MM:SS）
            - 終了日時（ISO 8601形式: YYYY-MM-DDTHH:MM:SS）
            
            日時が明示されていない場合は、適切に推測してください。
            日付が明示されていない場合は、今日または未来の日付を使用してください。
            年が省略されている場合は、必ず2025年で補完してください。
            
            テキスト:
            {text}
            
            JSONテンプレート:
            {{
                "title": "タスク名",
                "start": "YYYY-MM-DDTHH:MM:SS",
                "end": "YYYY-MM-DDTHH:MM:SS"
            }}
            
            JSON形式でのみ返してください。
            """
            
            # OpenAI APIを直接呼び出し
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "gpt-4",
                "messages": [
                    {"role": "system", "content": "あなたはテキストからタスク情報を抽出するAIアシスタントです。"},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 500
            }
            
            try:
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=30  # タイムアウトを30秒に設定
                )
            except requests.exceptions.Timeout:
                logger.error("OpenAI APIがタイムアウトしました")
                raise ValueError("APIリクエストがタイムアウトしました。後でもう一度お試しください。")
            except requests.exceptions.RequestException as e:
                logger.error(f"APIリクエスト中にネットワークエラーが発生しました: {str(e)}")
                raise ValueError("ネットワークエラーが発生しました。インターネット接続を確認してください。")
            
            if response.status_code == 401:
                logger.error("APIキーの認証に失敗しました")
                raise ValueError("APIキーが無効です。正しいAPIキーを設定してください。")
            elif response.status_code == 429:
                logger.error("APIレート制限に達しました")
                raise ValueError("APIの呼び出し回数制限に達しました。しばらく待ってから再試行してください。")
            elif response.status_code != 200:
                error_msg = response.json().get("error", {}).get("message", "不明なエラー")
                logger.error(f"OpenAI APIエラー: {error_msg}")
                raise ValueError(f"OpenAI APIエラー: {error_msg}")
            
            # レスポンスからJSONデータを抽出
            try:
                response_data = response.json()
                response_text = response_data["choices"][0]["message"]["content"].strip()
            except (KeyError, IndexError) as e:
                logger.error(f"APIレスポンスの解析に失敗しました: {str(e)}")
                raise ValueError("APIレスポンスの形式が不正です")
            
            # JSON文字列からPythonオブジェクトに変換
            try:
                task_data = json.loads(response_text)
            except json.JSONDecodeError:
                # レスポンスがJSON形式でない場合、再帰的にJSON部分を抽出して試みる
                import re
                json_match = re.search(r'({.*})', response_text.replace('\n', ''), re.DOTALL)
                if json_match:
                    try:
                        task_data = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        logger.error("抽出されたJSONの解析に失敗しました")
                        raise ValueError("APIからの応答を解析できませんでした")
                else:
                    logger.error("レスポンスからJSONを抽出できませんでした")
                    raise ValueError("APIからの応答がJSON形式ではありません")
            
            # 必須フィールドの検証
            required_fields = ["title", "start", "end"]
            for field in required_fields:
                if field not in task_data or not task_data[field]:
                    if field == "title":
                        task_data["title"] = "無題のタスク"
                    elif field == "start":
                        # 開始時間が指定されていない場合、現在時刻を使用
                        task_data["start"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                    elif field == "end":
                        # 終了時間が指定されていない場合、開始時間から30分後を使用
                        start_time = datetime.fromisoformat(task_data["start"])
                        task_data["end"] = (start_time + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%S")
            
            # オプションフィールドの初期化
            if "location" not in task_data:
                task_data["location"] = ""
            if "description" not in task_data:
                task_data["description"] = ""
            
            # start, end の年が省略されている場合は2025年に補完
            for key in ["start", "end"]:
                if key in task_data and task_data[key]:
                    try:
                        _ = datetime.fromisoformat(task_data[key])
                    except ValueError:
                        try:
                            # 年が省略されている場合（"MM-DDTHH:MM:SS"）
                            dt = datetime.strptime(task_data[key], "%m-%dT%H:%M:%S")
                            dt = dt.replace(year=2025)
                            task_data[key] = dt.strftime("%Y-%m-%dT%H:%M:%S")
                        except Exception:
                            try:
                                dt = datetime.strptime(task_data[key], "%H:%M:%S")
                                dt = dt.replace(year=2025, month=1, day=1)
                                task_data[key] = dt.strftime("%Y-%m-%dT%H:%M:%S")
                            except Exception:
                                pass
            # endは必ずstartから30分後にする
            if "start" in task_data and task_data["start"]:
                try:
                    start_time = datetime.fromisoformat(task_data["start"])
                    task_data["end"] = (start_time + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%S")
                except Exception:
                    pass
            
            return task_data
            
        except Exception as e:
            logger.error(f"テキスト解析でエラーが発生しました: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError("予期せぬエラーが発生しました。システム管理者に連絡してください。") 
