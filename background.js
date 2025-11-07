// Background service worker to intercept API requests

// Store the latest captured request
let capturedRequest = null;

// Listen for web requests to /api/instance/create
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === 'POST' && details.url.includes('/api/instance/create')) {
      // Get the request body
      let requestBody = null;
      if (details.requestBody) {
        if (details.requestBody.raw) {
          const decoder = new TextDecoder('utf-8');
          requestBody = decoder.decode(details.requestBody.raw[0].bytes);
        } else if (details.requestBody.formData) {
          requestBody = JSON.stringify(details.requestBody.formData);
        }
      }

      capturedRequest = {
        url: details.url,
        method: details.method,
        body: requestBody,
        timestamp: Date.now()
      };

      // Store in chrome.storage for popup access
      chrome.storage.local.set({ capturedRequest: capturedRequest });

      console.log('Captured request:', capturedRequest);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Listen for headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    if (details.method === 'POST' && details.url.includes('/api/instance/create')) {
      // Store headers
      if (capturedRequest && capturedRequest.timestamp && (Date.now() - capturedRequest.timestamp) < 1000) {
        capturedRequest.headers = {};
        details.requestHeaders.forEach(header => {
          capturedRequest.headers[header.name] = header.value;
        });

        // Update storage with headers
        chrome.storage.local.set({ capturedRequest: capturedRequest });
        console.log('Captured headers:', capturedRequest.headers);
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRequest') {
    chrome.storage.local.get(['capturedRequest'], (result) => {
      sendResponse(result.capturedRequest || null);
    });
    return true; // Keep channel open for async response
  }
});
