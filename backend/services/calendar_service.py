import os
import logging
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json
import pickle
from dotenv import load_dotenv

# 環境変数をロード
load_dotenv()

# ロギングの設定
logger = logging.getLogger(__name__)

# Google Calendar APIのスコープ
SCOPES = ['https://www.googleapis.com/auth/calendar']

class CalendarService:
    def __init__(self):
        """
        Google Calendar APIサービスの初期化
        """
        self.creds = None
        self.token_path = os.getenv("GOOGLE_TOKEN_PATH", "token.pickle")
        self.credentials_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
        self.mock_mode = False
        
        try:
            # 認証情報の取得
            if os.path.exists(self.token_path):
                with open(self.token_path, 'rb') as token:
                    self.creds = pickle.load(token)
            
            # 認証情報が存在しないか、無効な場合は再認証
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    if not os.path.exists(self.credentials_path):
                        logger.warning(f"credentials.jsonファイルが見つからないため、モックモードで実行します: {self.credentials_path}")
                        self.mock_mode = True
                        return
                    
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, SCOPES)
                    self.creds = flow.run_local_server(port=0)
                
                # トークンを保存して次回使用
                with open(self.token_path, 'wb') as token:
                    pickle.dump(self.creds, token)
            
            # Google Calendar APIサービスを初期化
            self.service = build('calendar', 'v3', credentials=self.creds)
        except Exception as e:
            logger.error(f"Google Calendar API初期化エラー: {str(e)}")
            logger.warning("モックモードで実行します")
            self.mock_mode = True
    
    def create_event(self, calendar_id, title, start_time, end_time, location=None, description=None):
        """
        カレンダーにイベントを作成する
        
        Args:
            calendar_id (str): カレンダーID
            title (str): イベントのタイトル
            start_time (str): 開始時間（ISO 8601形式）
            end_time (str): 終了時間（ISO 8601形式）
            location (str, optional): 場所
            description (str, optional): 説明
            
        Returns:
            str: 作成されたイベントのID
        """
        try:
            # モックモードの場合
            if self.mock_mode:
                import uuid
                # テスト用のイベントIDを生成
                event_id = str(uuid.uuid4())
                
                # ログにイベント情報を出力
                logger.info(f"テスト用モードでイベントが作成されました:")
                logger.info(f"  タイトル: {title}")
                logger.info(f"  開始時間: {start_time}")
                logger.info(f"  終了時間: {end_time}")
                logger.info(f"  場所: {location}")
                logger.info(f"  説明: {description}")
                logger.info(f"  イベントID: {event_id}")
                
                return event_id
            
            # end_timeがNoneまたは空の場合は1時間後に設定
            if not end_time:
                from datetime import datetime, timedelta
                start_dt = datetime.fromisoformat(start_time)
                end_dt = start_dt + timedelta(hours=1)
                end_time = end_dt.isoformat()
            
            # 実際のGoogle Calendar APIを使用
            event = {
                'summary': title,
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'Asia/Tokyo',
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'Asia/Tokyo',
                },
                'colorId': '2'  # 緑色を設定
            }
            
            if location:
                event['location'] = location
            if description:
                event['description'] = description
            
            created_event = self.service.events().insert(calendarId=calendar_id, body=event).execute()
            logger.info(f"イベントが作成されました: {created_event.get('htmlLink')}")
            return created_event['id']
            
        except HttpError as error:
            logger.error(f"Google Calendar APIエラー: {error}")
            raise
        except Exception as e:
            logger.error(f"イベント作成中にエラーが発生しました: {str(e)}")
            raise
    
    def get_event(self, calendar_id, event_id):
        """
        イベントの詳細を取得する
        
        Args:
            calendar_id (str): カレンダーID
            event_id (str): イベントID
            
        Returns:
            dict: イベント情報
        """
        try:
            # モックモードの場合
            if self.mock_mode:
                return {
                    "id": event_id,
                    "summary": "モックイベント",
                    "status": "confirmed"
                }
            
            # 実際のGoogle Calendar APIを使用
            event = self.service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            return event
        except HttpError as error:
            logger.error(f"Google Calendar APIエラー: {error}")
            raise
    
    def update_event(self, calendar_id, event_id, title=None, start_time=None, end_time=None, 
                   location=None, description=None):
        """
        既存のイベントを更新する
        
        Args:
            calendar_id (str): カレンダーID
            event_id (str): 更新するイベントのID
            title (str, optional): 新しいタイトル
            start_time (str, optional): 新しい開始時間（ISO 8601形式）
            end_time (str, optional): 新しい終了時間（ISO 8601形式）
            location (str, optional): 新しい場所
            description (str, optional): 新しい説明
            
        Returns:
            dict: 更新されたイベント情報
        """
        try:
            # モックモードの場合
            if self.mock_mode:
                logger.info(f"テスト用モードでイベントが更新されました: {event_id}")
                return {
                    "id": event_id,
                    "summary": title or "モックイベント",
                    "status": "confirmed"
                }
            
            # 実際のGoogle Calendar APIを使用
            # 既存のイベントを取得
            event = self.service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            
            # 更新する項目を設定
            if title:
                event['summary'] = title
            if start_time:
                event['start']['dateTime'] = start_time
            if end_time:
                event['end']['dateTime'] = end_time
            if location:
                event['location'] = location
            if description:
                event['description'] = description
            
            # イベントを更新
            updated_event = self.service.events().update(
                calendarId=calendar_id, eventId=event_id, body=event).execute()
            
            logger.info(f"イベントが更新されました: {updated_event.get('htmlLink')}")
            return updated_event
            
        except HttpError as error:
            logger.error(f"Google Calendar APIエラー: {error}")
            raise
    
    def delete_event(self, calendar_id, event_id):
        """
        イベントを削除する
        
        Args:
            calendar_id (str): カレンダーID
            event_id (str): 削除するイベントのID
            
        Returns:
            bool: 削除が成功したかどうか
        """
        try:
            # モックモードの場合
            if self.mock_mode:
                logger.info(f"テスト用モードでイベントが削除されました: {event_id}")
                return True
            
            # 実際のGoogle Calendar APIを使用
            self.service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            logger.info(f"イベントが削除されました: {event_id}")
            return True
        except HttpError as error:
            logger.error(f"Google Calendar APIエラー: {error}")
            raise 
