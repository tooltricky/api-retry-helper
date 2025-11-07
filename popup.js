// Popup script for retry logic

let capturedRequest = null;
let isRetrying = false;
let attemptCount = 0;

// DOM elements
const statusText = document.getElementById('statusText');
const requestInfo = document.getElementById('requestInfo');
const gpuModel = document.getElementById('gpuModel');
const requestTime = document.getElementById('requestTime');
const retryInfo = document.getElementById('retryInfo');
const attemptCountSpan = document.getElementById('attemptCount');
const lastResponse = document.getElementById('lastResponse');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const successMessage = document.getElementById('successMessage');

// Initialize popup
async function init() {
  // Get captured request from storage
  chrome.storage.local.get(['capturedRequest'], (result) => {
    if (result.capturedRequest) {
      capturedRequest = result.capturedRequest;
      displayRequestInfo();
      startBtn.disabled = false;
      statusText.textContent = '已检测到请求，点击开始抢卡';
    } else {
      statusText.textContent = '未检测到请求，请先访问页面并触发 确认部署 请求';
    }
  });
}

// Display request info
function displayRequestInfo() {
  requestInfo.classList.remove('hidden');
  gpuModel.textContent = JSON.parse(capturedRequest.body)['gpu_model'];
  const date = new Date(capturedRequest.timestamp);
  requestTime.textContent = date.toLocaleString('zh-CN');
}

// Start retry process
async function startRetry() {
  if (!capturedRequest) {
    alert('没有检测到请求');
    return;
  }

  isRetrying = true;
  attemptCount = 0;

  // Update UI
  startBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  retryInfo.classList.remove('hidden');
  successMessage.classList.add('hidden');
  statusText.textContent = '正在抢卡..';

  // Start retry loop
  while (isRetrying) {
    attemptCount++;
    attemptCountSpan.textContent = attemptCount;
    statusText.textContent = `正在抢卡.. (第 ${attemptCount} 次)`;

    try {
      // Prepare headers
      const headers = {};
      if (capturedRequest.headers) {
        Object.keys(capturedRequest.headers).forEach(key => {
          // Skip some headers that should not be set manually
          const lowerKey = key.toLowerCase();
          if (!['host', 'content-length', 'connection', 'origin', 'referer'].includes(lowerKey)) {
            headers[key] = capturedRequest.headers[key];
          }
        });
      }

      // Make the request
      const response = await fetch(capturedRequest.url, {
        method: capturedRequest.method || 'POST',
        headers: headers,
        body: capturedRequest.body,
        credentials: 'include'
      });

      // Parse response
      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { error: 'Failed to parse JSON', text: responseText };
      }

      // Display response
      lastResponse.textContent = responseData.msg;

      // Check if successful
      if (responseData.code === 200) {
        isRetrying = false;
        statusText.textContent = '请求成功！';
        successMessage.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
        startBtn.textContent = '重新开始';
        startBtn.disabled = false;
        break;
      }

      // Continue immediately (no delay)
    } catch (error) {
      lastResponse.textContent = `错误: ${error.message}`;
      console.error('Request failed:', error);
    }

    // Check if still retrying (user might have clicked stop)
    if (!isRetrying) {
      break;
    }
  }
}

// Stop retry process
function stopRetry() {
  isRetrying = false;
  statusText.textContent = '已停止抢卡';
  stopBtn.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startBtn.disabled = false;
}

// Event listeners
startBtn.addEventListener('click', startRetry);
stopBtn.addEventListener('click', stopRetry);

// Initialize on load
init();
