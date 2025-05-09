// DOM要素
const titleInput = document.getElementById('title');
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const locationInput = document.getElementById('location');
const descriptionInput = document.getElementById('description');
const addToCalendarBtn = document.getElementById('add-to-calendar');
const clearFormBtn = document.getElementById('clear-form');
const statusMessage = document.getElementById('status-message');

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
  // 保存されたタスクデータの取得
  chrome.storage.local.get(['taskData', 'status', 'error', 'eventId'], (data) => {
    if (data.taskData) {
      fillFormWithTaskData(data.taskData);
    }
    
    // ステータスメッセージの表示
    if (data.status === 'error' && data.error) {
      showMessage(data.error, 'error');
    } else if (data.status === 'success') {
      showMessage('カレンダーに追加しました！', 'success');
      // 成功時はボタンのテキストを変更
      addToCalendarBtn.textContent = '追加しました';
      addToCalendarBtn.disabled = true;
      
      // 3秒後にボタンを元に戻す
      setTimeout(() => {
        addToCalendarBtn.disabled = false;
        addToCalendarBtn.textContent = 'Googleカレンダーに追加';
      }, 3000);
    }
  });
  
  // イベントリスナーの設定
  addToCalendarBtn.addEventListener('click', handleAddToCalendar);
  clearFormBtn.addEventListener('click', clearForm);
  
  // 開始時間変更時に終了時間を自動調整
  startInput.addEventListener('change', () => {
    // 終了時間が開始時間よりも前の場合、開始時間から1時間後に設定
    if (startInput.value && (!endInput.value || new Date(endInput.value) <= new Date(startInput.value))) {
      const startDate = new Date(startInput.value);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1時間後
      
      // 日時フォーマット yyyy-MM-ddThh:mm
      const year = endDate.getFullYear();
      const month = (endDate.getMonth() + 1).toString().padStart(2, '0');
      const day = endDate.getDate().toString().padStart(2, '0');
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      
      endInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  });
});

// タスクデータでフォームを埋める
function fillFormWithTaskData(taskData) {
  if (taskData.title) {
    titleInput.value = taskData.title;
  }
  
  if (taskData.start) {
    // ISO 8601形式 (YYYY-MM-DDTHH:MM:SS) をdatetime-local形式 (YYYY-MM-DDTHH:MM) に変換
    const startDate = new Date(taskData.start);
    const year = startDate.getFullYear();
    const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const day = startDate.getDate().toString().padStart(2, '0');
    const hours = startDate.getHours().toString().padStart(2, '0');
    const minutes = startDate.getMinutes().toString().padStart(2, '0');
    
    startInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  if (taskData.end) {
    // ISO 8601形式 (YYYY-MM-DDTHH:MM:SS) をdatetime-local形式 (YYYY-MM-DDTHH:MM) に変換
    const endDate = new Date(taskData.end);
    const year = endDate.getFullYear();
    const month = (endDate.getMonth() + 1).toString().padStart(2, '0');
    const day = endDate.getDate().toString().padStart(2, '0');
    const hours = endDate.getHours().toString().padStart(2, '0');
    const minutes = endDate.getMinutes().toString().padStart(2, '0');
    
    endInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  if (taskData.location) {
    locationInput.value = taskData.location;
  }
  
  if (taskData.description) {
    descriptionInput.value = taskData.description;
  }
}

// カレンダーに追加処理
function handleAddToCalendar() {
  // 入力検証
  if (!titleInput.value) {
    showMessage('タイトルを入力してください', 'error');
    return;
  }
  
  if (!startInput.value) {
    showMessage('開始日時を入力してください', 'error');
    return;
  }
  
  if (!endInput.value) {
    showMessage('終了日時を入力してください', 'error');
    return;
  }
  
  // タスクデータの作成
  const taskData = {
    title: titleInput.value,
    start: new Date(startInput.value).toISOString(),
    end: new Date(endInput.value).toISOString(),
    location: locationInput.value,
    description: descriptionInput.value
  };
  
  // ボタンの状態を変更
  addToCalendarBtn.disabled = true;
  addToCalendarBtn.textContent = '追加中...';
  
  // バックグラウンドスクリプトにメッセージを送信
  chrome.runtime.sendMessage(
    { action: 'addToCalendar', taskData },
    (response) => {
      console.log('Response from addToCalendar:', response);
      if (response && response.success) {
        // 成功
        showMessage('カレンダーに追加しました！', 'success');
        addToCalendarBtn.textContent = '追加しました';
        
        // 3秒後にボタンを元に戻す
        setTimeout(() => {
          addToCalendarBtn.disabled = false;
          addToCalendarBtn.textContent = 'Googleカレンダーに追加';
        }, 3000);
      } else {
        // エラー
        showMessage(response.error || 'エラーが発生しました', 'error');
        addToCalendarBtn.disabled = false;
        addToCalendarBtn.textContent = 'Googleカレンダーに追加';
      }
    }
  );
}

// フォームをクリア
function clearForm() {
  titleInput.value = '';
  startInput.value = '';
  endInput.value = '';
  locationInput.value = '';
  descriptionInput.value = '';
  
  // ステータスメッセージをクリア
  statusMessage.textContent = '';
  statusMessage.className = 'status-message';
  
  // ストレージからタスクデータをクリア
  chrome.storage.local.remove(['taskData', 'status', 'error', 'eventId']);
}

// メッセージを表示
function showMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
} 
