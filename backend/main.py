from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
import json
import logging
from pathlib import Path

from services.text_analyzer import TextAnalyzer
from services.calendar_service import CalendarService

# ロギングの設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Todo Calendar API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# モデル定義
class TextInput(BaseModel):
    text: str

class CalendarEvent(BaseModel):
    title: str
    start: str
    end: str
    location: str = ""
    description: str = ""

# 静的ファイルのマウント
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return {"status": "healthy"}

@app.post("/analyze")
def analyze_text(input_data: TextInput):
    try:
        analyzer = TextAnalyzer()
        task_data = analyzer.extract_task(input_data.text)
        logger.info(f"Extracted task data: {task_data}")
        return task_data
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calendar/add")
def add_to_calendar(event_data: CalendarEvent):
    try:
        # カレンダーサービスの初期化（テスト用モック実装）
        calendar_service = CalendarService()
        
        # プライマリカレンダーを使用
        calendar_id = "primary"
        
        # イベントの作成
        event_id = calendar_service.create_event(
            calendar_id=calendar_id,
            title=event_data.title,
            start_time=event_data.start,
            end_time=event_data.end,
            location=event_data.location,
            description=event_data.description
        )
        
        # 成功レスポンス
        logger.info(f"Event added successfully with ID: {event_id}")
        return {"status": "success", "event_id": event_id}
        
    except Exception as e:
        logger.error(f"Error adding to calendar: {str(e)}")
        # 本番環境ではエラー詳細を隠し、一般的なメッセージを返すべき
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/setup", response_class=HTMLResponse)
async def setup_page():
    return FileResponse("static/setup.html")

@app.post("/api/setup")
async def setup(
    openai_key: str = Form(...),
    credentials_file: UploadFile = File(...)
):
    try:
        # OpenAI APIキーの保存
        env_content = f"OPENAI_API_KEY={openai_key}\n"
        env_content += "GOOGLE_CREDENTIALS_PATH=credentials.json\n"
        env_content += "GOOGLE_TOKEN_PATH=token.pickle\n"
        
        with open(".env", "w") as f:
            f.write(env_content)
        
        # credentials.jsonの保存
        credentials_content = await credentials_file.read()
        with open("credentials.json", "wb") as f:
            f.write(credentials_content)
        
        return {"message": "Setup completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    uvicorn.run("main:app", host=host, port=port, reload=debug) 
