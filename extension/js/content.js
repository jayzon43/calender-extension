// ポップアップの表示状態
let taskPopupVisible = false;
let taskPopupElement = null;
let notificationElement = null;

// タスク確認ダイアログのスタイルを定義
const dialogStyles = `
  .task-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    min-width: 300px;
  }
  .task-dialog h2 {
    margin-top: 0;
  }
  .task-dialog .buttons {
    margin-top: 20px;
    text-align: right;
  }
  .task-dialog button {
    padding: 8px 16px;
    margin-left: 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .task-dialog .confirm {
    background: #4CAF50;
    color: white;
  }
  .task-dialog .cancel {
    background: #f5f5f5;
  }
`;

// スタイルを追加
const style = document.createElement('style');
style.textContent = dialogStyles;
document.head.appendChild(style);

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTaskPopup' && message.taskData) {
    showTaskPopup(message.taskData);
    sendResponse({ success: true });
  } else if (message.action === 'showNotification') {
    showNotification(message.type, message.message);
    sendResponse({ success: true });
  } else if (message.action === 'showTaskConfirmation') {
    showTaskConfirmationDialog(message.taskData);
  } else if (message.action === 'showError') {
    showError(message.error);
  }
});

// 通知を表示する関数
function showNotification(type, message) {
  // 既存の通知があれば削除
  hideNotification();
  
  // 通知HTML要素を作成
  notificationElement = document.createElement('div');
  notificationElement.className = 'todo-calendar-notification';
  
  // 背景色の設定
  let backgroundColor = '#4285F4'; // デフォルトは青（情報）
  let textColor = '#ffffff';
  let icon = '✓';
  
  if (type === 'error') {
    backgroundColor = '#ea4335'; // エラーは赤
    icon = '⚠';
  } else if (type === 'success') {
    backgroundColor = '#34a853'; // 成功は緑
    icon = '✓';
  } else if (type === 'warning') {
    backgroundColor = '#fbbc05'; // 警告は黄色
    textColor = '#000000';
    icon = '⚠';
  }
  
  // 通知のスタイル
  notificationElement.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 300px;
    padding: 12px 16px;
    background-color: ${backgroundColor};
    color: ${textColor};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    z-index: 999999;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  // 通知のコンテンツ
  notificationElement.innerHTML = `
    <div style="margin-right: 12px; font-size: 20px;">${icon}</div>
    <div>${message}</div>
  `;
  
  // 通知をDOMに追加
  document.body.appendChild(notificationElement);
  
  // アニメーション用にタイミングをずらす
  setTimeout(() => {
    notificationElement.style.opacity = '1';
  }, 10);
  
  // 5秒後に通知を消す
  setTimeout(hideNotification, 5000);
}

// 通知を非表示にする関数
function hideNotification() {
  if (notificationElement) {
    // フェードアウトアニメーション
    notificationElement.style.opacity = '0';
    
    // アニメーション後に要素を削除
    setTimeout(() => {
      if (notificationElement) {
        notificationElement.remove();
        notificationElement = null;
      }
    }, 300);
  }
}

// タスクポップアップの表示
function showTaskPopup(taskData) {
  // 既存のポップアップがあれば削除
  if (taskPopupElement) {
    taskPopupElement.remove();
  }
  
  // ポップアップHTML要素を作成
  taskPopupElement = document.createElement('div');
  taskPopupElement.className = 'todo-calendar-popup';
  
  // ポップアップのスタイル
  taskPopupElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    background-color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    z-index: 999999;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    color: #333;
    overflow: hidden;
  `;
  
  // 開始・終了日時のフォーマット
  const startDate = new Date(taskData.start);
  const endDate = new Date(taskData.end);
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };
  
  // ポップアップのコンテンツ
  taskPopupElement.innerHTML = `
    <div style="background-color: #4285F4; color: white; padding: 12px 16px; position: relative;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 500;">タスクが抽出されました</h3>
      <button id="close-popup" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: white; cursor: pointer; font-size: 20px;">×</button>
    </div>
    
    <div style="padding: 16px;">
      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 4px 0; font-weight: 500;">タイトル</p>
        <p style="margin: 0; padding: 8px; background-color: #f1f3f4; border-radius: 4px;">${taskData.title}</p>
      </div>
      
      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <div style="flex: 1;">
          <p style="margin: 0 0 4px 0; font-weight: 500;">開始</p>
          <p style="margin: 0; padding: 8px; background-color: #f1f3f4; border-radius: 4px; font-size: 13px;">${formatDate(startDate)}</p>
        </div>
        <div style="flex: 1;">
          <p style="margin: 0 0 4px 0; font-weight: 500;">終了</p>
          <p style="margin: 0; padding: 8px; background-color: #f1f3f4; border-radius: 4px; font-size: 13px;">${formatDate(endDate)}</p>
        </div>
      </div>
      
      ${taskData.location ? `
      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 4px 0; font-weight: 500;">場所</p>
        <p style="margin: 0; padding: 8px; background-color: #f1f3f4; border-radius: 4px;">${taskData.location}</p>
      </div>
      ` : ''}
      
      ${taskData.description ? `
      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 4px 0; font-weight: 500;">説明</p>
        <p style="margin: 0; padding: 8px; background-color: #f1f3f4; border-radius: 4px; max-height: 80px; overflow-y: auto;">${taskData.description}</p>
      </div>
      ` : ''}
      
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="edit-task" style="flex: 1; padding: 8px 12px; background-color: #f1f1f1; border: none; border-radius: 4px; cursor: pointer;">編集</button>
        <button id="add-to-calendar" style="flex: 1; padding: 8px 12px; background-color: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">カレンダーに追加</button>
      </div>
    </div>
  `;
  
  // ポップアップをDOMに追加
  document.body.appendChild(taskPopupElement);
  taskPopupVisible = true;
  
  // 閉じるボタンのイベントリスナー
  document.getElementById('close-popup').addEventListener('click', () => {
    taskPopupElement.remove();
    taskPopupElement = null;
    taskPopupVisible = false;
  });
  
  // 編集ボタンのイベントリスナー
  document.getElementById('edit-task').addEventListener('click', () => {
    // ポップアップを開く
    chrome.storage.local.set({ 'taskData': taskData });
    chrome.runtime.sendMessage({ action: 'openPopup' });
    
    // 現在のポップアップを閉じる
    taskPopupElement.remove();
    taskPopupElement = null;
    taskPopupVisible = false;
  });
  
  // カレンダーに追加ボタンのイベントリスナー
  document.getElementById('add-to-calendar').addEventListener('click', () => {
    const button = document.getElementById('add-to-calendar');
    button.disabled = true;
    button.textContent = '追加中...';
    
    console.log('Sending task data to background:', taskData);
    
    chrome.runtime.sendMessage(
      { action: 'addToCalendar', taskData },
      (response) => {
        console.log('Response from background addToCalendar:', response);
        
        if (response && response.success) {
          // 成功
          button.textContent = '追加しました';
          button.style.backgroundColor = '#34a853';
          
          // 3秒後にポップアップを閉じる
          setTimeout(() => {
            if (taskPopupElement) {
              taskPopupElement.remove();
              taskPopupElement = null;
              taskPopupVisible = false;
            }
          }, 3000);
        } else {
          // エラー
          button.textContent = 'エラーが発生しました';
          button.style.backgroundColor = '#ea4335';
          
          // エラーメッセージを表示
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            margin-top: 12px;
            padding: 8px;
            background-color: #fdeded;
            border-radius: 4px;
            color: #ea4335;
            font-size: 12px;
          `;
          errorDiv.textContent = response?.error || 'カレンダーへの追加中にエラーが発生しました';
          
          // エラーメッセージをポップアップに追加
          const buttonContainer = button.parentElement;
          buttonContainer.parentElement.appendChild(errorDiv);
          
          button.disabled = false;
        }
      }
    );
  });
}

// タスク確認ダイアログを表示
function showTaskConfirmationDialog(taskData) {
  const dialog = document.createElement('div');
  dialog.className = 'task-dialog';
  dialog.innerHTML = `
    <h2>タスクの確認</h2>
    <div>
      <p><strong>タイトル:</strong> ${taskData.title}</p>
      <p><strong>日時:</strong> ${taskData.datetime}</p>
      <p><strong>説明:</strong> ${taskData.description || '説明なし'}</p>
    </div>
    <div class="buttons">
      <button class="cancel">キャンセル</button>
      <button class="confirm">カレンダーに追加</button>
    </div>
  `;

  // ボタンのイベントリスナーを設定
  dialog.querySelector('.cancel').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });

  dialog.querySelector('.confirm').addEventListener('click', () => {
    // Google Calendarに追加
    fetch('http://localhost:8000/add-to-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    })
    .then(response => response.json())
    .then(result => {
      alert('タスクがカレンダーに追加されました！');
      document.body.removeChild(dialog);
    })
    .catch(error => {
      alert('カレンダーへの追加に失敗しました。');
      console.error('Error:', error);
    });
  });

  document.body.appendChild(dialog);
}

// エラーメッセージを表示
function showError(message) {
  alert(message);
} 
