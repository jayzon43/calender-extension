// APIのベースURL
const API_BASE_URL = 'http://localhost:8000';

// コンテキストメニューの作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extractTask',
    title: 'タスクを抽出',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'extractAndAddTask',
    title: 'タスクを抽出してカレンダーに追加',
    contexts: ['selection']
  });
});

// コンテキストメニューのクリックイベント
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extractTask') {
    // 選択されたテキストを取得
    const selectedText = info.selectionText;
    
    // バックエンドにテキストを送信
    fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: selectedText })
    })
    .then(response => response.json())
    .then(taskData => {
      // タスクデータをコンテンツスクリプトに送信
      chrome.tabs.sendMessage(tab.id, {
        action: 'showTaskConfirmation',
        taskData: taskData
      });
    })
    .catch(error => {
      console.error('Error:', error);
      // エラーメッセージをコンテンツスクリプトに送信
      chrome.tabs.sendMessage(tab.id, {
        action: 'showError',
        error: 'タスクの抽出に失敗しました。'
      });
    });
  } else if (info.menuItemId === 'extractAndAddTask' && info.selectionText) {
    // 選択されたテキストを解析してカレンダーに自動追加
    analyzeText(info.selectionText, tab.id, true);
  }
});

// テキスト解析関数
async function analyzeText(text, tabId, autoAddToCalendar = false) {
  try {
    // ステータス更新
    chrome.storage.local.set({ 'status': 'analyzing' });
    
    console.log('Sending text to API:', text);
    
    // APIリクエスト
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API error response:', errorData);
      throw new Error(`API error: ${response.status}. Details: ${errorData}`);
    }
    
    // レスポンスデータを取得
    const taskData = await response.json();
    console.log('Received task data:', taskData);
    
    // タスクデータを保存
    chrome.storage.local.set({
      'status': 'analyzed',
      'taskData': taskData
    });
    
    // 自動追加モードの場合はカレンダーに追加
    if (autoAddToCalendar) {
      console.log('Auto adding to calendar:', taskData);
      try {
        const result = await addToCalendar(taskData);
        // 成功通知を表示
        chrome.tabs.sendMessage(tabId, {
          action: 'showNotification',
          type: 'success',
          message: 'カレンダーに追加しました'
        });
      } catch (error) {
        console.error('Error auto-adding to calendar:', error);
        // エラー通知を表示
        chrome.tabs.sendMessage(tabId, {
          action: 'showNotification',
          type: 'error',
          message: `カレンダー追加エラー: ${error.message}`
        });
      }
    } else {
      // 通常モードではタブにメッセージを送信してポップアップを表示
      chrome.tabs.sendMessage(tabId, {
        action: 'showTaskPopup',
        taskData
      });
    }
    
  } catch (error) {
    console.error('Error analyzing text:', error);
    chrome.storage.local.set({
      'status': 'error',
      'error': error.message
    });
    
    // エラー通知を表示
    chrome.tabs.sendMessage(tabId, {
      action: 'showNotification',
      type: 'error',
      message: `テキスト解析エラー: ${error.message}`
    });
  }
}

// カレンダーにイベントを追加
async function addToCalendar(taskData) {
  try {
    // ステータス更新
    chrome.storage.local.set({ 'status': 'adding' });
    
    console.log('Adding task to calendar:', taskData);
    
    // APIリクエスト - 新しいAPI形式に合わせて修正
    const response = await fetch(`${API_BASE_URL}/calendar/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData) // タスクデータをそのまま送信
    });
    
    console.log('Calendar API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Calendar API error response:', errorData);
      throw new Error(`API error: ${response.status}. Details: ${errorData}`);
    }
    
    // レスポンスデータを取得
    const result = await response.json();
    console.log('Calendar API response:', result);
    
    // 成功ステータスを設定
    chrome.storage.local.set({
      'status': 'success',
      'eventId': result.event_id // キー名の変更: eventId → event_id
    });
    
    return result;
    
  } catch (error) {
    console.error('Error adding to calendar:', error);
    chrome.storage.local.set({
      'status': 'error',
      'error': error.message
    });
    throw error;
  }
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeText') {
    analyzeText(message.text, sender.tab?.id, message.autoAddToCalendar || false)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスのために true を返す
  }
  
  if (message.action === 'addToCalendar') {
    addToCalendar(message.taskData)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスのために true を返す
  }
}); 
