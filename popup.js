document.addEventListener('DOMContentLoaded', function() {
  const supadataApiKeyInput = document.getElementById('supadata-api-key');
  const openrouterApiKeyInput = document.getElementById('openrouter-api-key');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const debugBtn = document.getElementById('debugBtn');
  const statusDiv = document.getElementById('status');

  // Load existing API keys
  chrome.storage.local.get(['supadata_api_key', 'openrouter_api_key'], function(result) {
    if (result.supadata_api_key) {
      supadataApiKeyInput.value = result.supadata_api_key;
    }
    if (result.openrouter_api_key) {
      openrouterApiKeyInput.value = result.openrouter_api_key;
    }
    updateButtonStates();
  });

  // Enable/disable buttons based on API key input
  function updateButtonStates() {
    const hasSupadataKey = supadataApiKeyInput.value.trim();
    const hasOpenRouterKey = openrouterApiKeyInput.value.trim();
    const hasBothKeys = hasSupadataKey && hasOpenRouterKey;
    
    testBtn.disabled = !hasBothKeys;
    debugBtn.disabled = !hasSupadataKey;
  }

  supadataApiKeyInput.addEventListener('input', updateButtonStates);
  openrouterApiKeyInput.addEventListener('input', updateButtonStates);

  // Save API keys
  saveBtn.addEventListener('click', function() {
    const supadataApiKey = supadataApiKeyInput.value.trim();
    const openrouterApiKey = openrouterApiKeyInput.value.trim();
    
    if (!supadataApiKey || !openrouterApiKey) {
      showStatus('Please enter both API keys', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    chrome.storage.local.set({
      'supadata_api_key': supadataApiKey,
      'openrouter_api_key': openrouterApiKey
    }, function() {
      showStatus('API keys saved successfully!', 'success');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Configuration';
      updateButtonStates();
    });
  });

  // Test API connections
  testBtn.addEventListener('click', async function() {
    const supadataApiKey = supadataApiKeyInput.value.trim();
    const openrouterApiKey = openrouterApiKeyInput.value.trim();
    
    if (!supadataApiKey || !openrouterApiKey) {
      showStatus('Please enter both API keys first', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    showStatus('Testing API connections...', 'info');

    try {
      // Test Supadata API
      const supadataSuccess = await testSupadataConnection(supadataApiKey);
      if (!supadataSuccess) {
        showStatus('❌ Supadata API connection failed', 'error');
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
        return;
      }

      // Test OpenRouter API
      const openrouterSuccess = await testOpenRouterConnection(openrouterApiKey);
      if (!openrouterSuccess) {
        showStatus('❌ OpenRouter API connection failed', 'error');
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
        return;
      }

      showStatus('✅ Both API connections successful!', 'success');
    } catch (error) {
      showStatus(`❌ Test failed: ${error.message}`, 'error');
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  });

  // Show debug information
  debugBtn.addEventListener('click', function() {
    const supadataApiKey = supadataApiKeyInput.value.trim();
    const openrouterApiKey = openrouterApiKeyInput.value.trim();
    
    if (!supadataApiKey) {
      showStatus('Please enter Supadata API key first', 'error');
      return;
    }

    const testVideoId = 'dQw4w9WgXcQ';
    const supadataCurlCommand = `curl -X GET 'https://api.supadata.ai/v1/youtube/transcript?videoId=${testVideoId}&text=true' \\
  -H 'x-api-key: ${supadataApiKey}'`;

    const openrouterCurlCommand = `curl -X POST 'https://openrouter.ai/api/v1/chat/completions' \\
  -H 'Authorization: Bearer ${openrouterApiKey || 'YOUR_OPENROUTER_KEY'}' \\
  -H 'Content-Type: application/json' \\
  -d '{"model": "openai/gpt-oss-20b:free", "messages": [{"role": "user", "content": "Test message"}]}'`;

    const debugInfo = `🔧 DEBUG INFORMATION:

SUPADATA API:
Endpoint: https://api.supadata.ai/v1/youtube/transcript
Method: GET
Headers: x-api-key: ${supadataApiKey.substring(0, 8)}...
Test Video ID: ${testVideoId}

📋 Supadata CURL Command:
${supadataCurlCommand}

OPENROUTER API:
Endpoint: https://openrouter.ai/api/v1/chat/completions
Method: POST
Model: openai/gpt-oss-20b:free
Headers: Authorization: Bearer ${openrouterApiKey ? openrouterApiKey.substring(0, 12) + '...' : 'YOUR_KEY'}

📋 OpenRouter CURL Command:
${openrouterCurlCommand}

Expected Responses:
Supadata: {"content": "transcript text...", "lang": "en", "availableLangs": ["en"]}
OpenRouter: {"choices": [{"message": {"content": "response..."}}]}`;

    // Copy debug info to clipboard
    navigator.clipboard.writeText(debugInfo).then(() => {
      showStatus('🔧 Debug info copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback - show in alert
      alert(debugInfo);
    });
  });

  // Test Supadata API connection
  async function testSupadataConnection(apiKey) {
    try {
      // Use a simple test endpoint with known YouTube video
      const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - commonly available video
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${testVideoId}&text=true`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return true;
      } else if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 403) {
        throw new Error('API key has insufficient permissions');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        // Get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - check your internet connection');
      }
      throw error;
    }
  }

  // Add OpenRouter API test function
  async function testOpenRouterConnection(apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return true;
      } else if (response.status === 401) {
        throw new Error('Invalid OpenRouter API key');
      } else if (response.status === 403) {
        throw new Error('OpenRouter API key has insufficient permissions');
      } else if (response.status === 429) {
        throw new Error('OpenRouter rate limit exceeded');
      } else {
        let errorMessage = `OpenRouter HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter connection timeout');
      }
      throw error;
    }
  }

  // Enter key to save
  supadataApiKeyInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  openrouterApiKeyInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      if (type !== 'info') { // Don't auto-hide info messages during testing
        statusDiv.style.display = 'none';
      }
    }, type === 'success' ? 4000 : 6000);
  }
});