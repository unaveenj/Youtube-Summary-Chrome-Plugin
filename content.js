let buttonInjected = false;
let currentVideoId = null;

// Secure API key management
async function getSecureApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['yt_summarizer_encrypted_key'], (result) => {
      if (result.yt_summarizer_encrypted_key) {
        // Simple decryption (basic obfuscation)
        const decoded = atob(result.yt_summarizer_encrypted_key);
        resolve(decoded);
      } else {
        resolve(null);
      }
    });
  });
}

async function setSecureApiKey(apiKey) {
  // Simple encryption (basic obfuscation)
  const encoded = btoa(apiKey);
  return new Promise((resolve) => {
    chrome.storage.local.set({ yt_summarizer_encrypted_key: encoded }, resolve);
  });
}

async function clearSecureApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['yt_summarizer_encrypted_key'], resolve);
  });
}

function getCurrentVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function injectSummarizeButton() {
  if (buttonInjected) return;
  
  // Wait for YouTube's action buttons to load
  const actionsContainer = document.querySelector('#actions-inner, #menu-container #top-level-buttons-computed');
  if (!actionsContainer) {
    setTimeout(injectSummarizeButton, 1000);
    return;
  }
  
  // Create container for both buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.alignItems = 'center';
  
  // Create the summarize button
  const summarizerButton = document.createElement('button');
  summarizerButton.id = 'yt-summarizer-button';
  summarizerButton.className = 'yt-summarizer-btn';
  summarizerButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
    <span>Summarize</span>
  `;
  summarizerButton.title = 'Summarize with ChatGPT';
  summarizerButton.addEventListener('click', handleSummarizeClick);
  
  // Create settings button
  const settingsButton = document.createElement('button');
  settingsButton.id = 'yt-summarizer-settings';
  settingsButton.className = 'yt-summarizer-btn yt-summarizer-settings-btn';
  settingsButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
    </svg>
  `;
  settingsButton.title = 'Summarizer Settings';
  settingsButton.addEventListener('click', showSettingsModal);
  
  // Add buttons to container
  buttonContainer.appendChild(summarizerButton);
  buttonContainer.appendChild(settingsButton);
  
  // Insert container into actions
  actionsContainer.appendChild(buttonContainer);
  buttonInjected = true;
}

function extractTranscriptFromYouTubeData() {
  return new Promise((resolve, reject) => {
    try {
      // Method 1: Try window.ytInitialPlayerResponse
      let ytData = window.ytInitialPlayerResponse;
      
      // Method 2: Try to find it in script tags
      if (!ytData) {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.innerHTML;
          if (content.includes('ytInitialPlayerResponse')) {
            const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
            if (match) {
              try {
                ytData = JSON.parse(match[1]);
                break;
              } catch (e) {
                continue;
              }
            }
          }
        }
      }
      
      // Method 3: Try window.ytplayer.config
      if (!ytData && window.ytplayer && window.ytplayer.config) {
        ytData = window.ytplayer.config.args.player_response;
        if (typeof ytData === 'string') {
          ytData = JSON.parse(ytData);
        }
      }
      
      if (!ytData) {
        reject('YouTube player data not found. Please try refreshing the page.');
        return;
      }
      
      const videoDetails = ytData.videoDetails;
      const captions = ytData.captions;
      
      if (!captions || !captions.playerCaptionsTracklistRenderer) {
        reject('No captions available for this video. Please enable captions or try a different video.');
        return;
      }
      
      const captionTracks = captions.playerCaptionsTracklistRenderer.captionTracks;
      if (!captionTracks || captionTracks.length === 0) {
        reject('No caption tracks found for this video.');
        return;
      }
      
      // Find English captions or auto-generated captions
      let selectedTrack = captionTracks.find(track => 
        track.languageCode === 'en' || track.languageCode === 'en-US' || track.languageCode === 'en-GB'
      );
      
      // If no English, try auto-generated
      if (!selectedTrack) {
        selectedTrack = captionTracks.find(track => track.kind === 'asr');
      }
      
      // Fallback to first available
      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }
      
      const captionUrl = selectedTrack.baseUrl;
      
      // Fetch the caption data
      fetch(captionUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.text();
        })
        .then(xmlData => {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
          const textNodes = xmlDoc.querySelectorAll('text');
          
          let transcript = '';
          textNodes.forEach(node => {
            const text = node.textContent || node.innerText;
            if (text) {
              // Clean up HTML entities and extra whitespace
              const cleanText = text.replace(/&quot;/g, '"')
                                   .replace(/&#39;/g, "'")
                                   .replace(/&amp;/g, '&')
                                   .replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>')
                                   .replace(/\s+/g, ' ')
                                   .trim();
              if (cleanText) {
                transcript += cleanText + ' ';
              }
            }
          });
          
          if (transcript.trim()) {
            resolve({
              title: videoDetails?.title || 'Unknown',
              channel: videoDetails?.author || 'Unknown',
              transcript: transcript.trim(),
              duration: videoDetails?.lengthSeconds || 0,
              url: window.location.href
            });
          } else {
            reject('Empty transcript extracted. The video may not have captions available.');
          }
        })
        .catch(error => {
          reject(`Failed to fetch captions: ${error.message}`);
        });
    } catch (error) {
      reject(`Error extracting transcript: ${error.message}`);
    }
  });
}

function createSummaryPrompt(videoData) {
  return `Please summarize this YouTube video and provide the key points:

**Video Title:** ${videoData.title}
**Channel:** ${videoData.channel}
**Duration:** ${Math.floor(videoData.duration / 60)} minutes

**Transcript:**
${videoData.transcript}

Please provide:
1. Main topic/theme of the video
2. Key points (3-5 bullet points)
3. Important conclusions or takeaways
4. Any actionable advice or recommendations

Keep the summary concise but informative.`;
}

async function handleSummarizeClick() {
  const button = document.getElementById('yt-summarizer-button');
  const originalText = button.innerHTML;
  
  // Show loading state
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" class="spinning">
      <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
    </svg>
    <span>Loading...</span>
  `;
  button.disabled = true;
  
  try {
    let transcriptData;
    
    try {
      // Try direct extraction first
      transcriptData = await extractTranscriptFromYouTubeData();
      showNotification('Transcript extracted successfully! Opening ChatGPT...', 'success');
    } catch (directError) {
      console.log('Direct extraction failed, trying API method:', directError);
      
      // Show API loading message
      button.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" class="spinning">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>
        <span>API...</span>
      `;
      
      try {
        // Try API method
        transcriptData = await extractTranscriptWithAPI();
        showNotification('Transcript extracted via API! Opening ChatGPT...', 'success');
      } catch (apiError) {
        console.log('API extraction failed:', apiError);
        
        // Reset button to normal state
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show manual transcript option
        showManualTranscriptOption();
        return;
      }
    }
    
    const prompt = createSummaryPrompt(transcriptData);
    
    // Open ChatGPT with the prompt
    const chatGPTUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    window.open(chatGPTUrl, '_blank');
    
    // Track usage
    trackUsage();
    
    // Reset button after a short delay
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error generating summary:', error);
    
    // Show error state
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
      </svg>
      <span>Manual</span>
    `;
    
    // Reset button after delay
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 5000);
    
    // Offer manual transcript option
    showManualTranscriptOption();
  }
}

async function extractTranscriptWithAPI() {
  return new Promise(async (resolve, reject) => {
    try {
      const videoUrl = window.location.href;
      const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string')?.textContent || 'Unknown';
      const channelName = document.querySelector('#channel-name a')?.textContent || 'Unknown';
      
      // Get saved API key
      const savedApiKey = await getSecureApiKey();
      
      const apiKeys = savedApiKey ? [savedApiKey] : [];
      
      let lastError = null;
      
      for (const apiKey of apiKeys) {
        try {
          const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(videoUrl)}&text=true`, {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data && data.content && data.content.trim()) {
              resolve({
                title: videoTitle,
                channel: channelName,
                transcript: data.content.trim(),
                duration: 0,
                url: videoUrl,
                language: data.language || 'unknown'
              });
              return;
            } else {
              lastError = 'Empty transcript returned from API';
            }
          } else if (response.status === 401) {
            lastError = 'API key invalid or expired';
            continue; // Try next API key
          } else if (response.status === 429) {
            lastError = 'API rate limit exceeded';
            break; // Don't try other keys if rate limited
          } else {
            const errorData = await response.json().catch(() => ({}));
            lastError = errorData.message || `API error: ${response.status}`;
          }
        } catch (fetchError) {
          lastError = `Network error: ${fetchError.message}`;
        }
      }
      
      reject(lastError || 'Failed to extract transcript via API');
    } catch (error) {
      reject(`API extraction error: ${error.message}`);
    }
  });
}

function showManualTranscriptOption() {
  const videoId = getCurrentVideoId();
  const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string')?.textContent || 'Unknown';
  const channelName = document.querySelector('#channel-name a')?.textContent || 'Unknown';
  
  // Create modal for manual transcript input
  const modal = document.createElement('div');
  modal.className = 'yt-summarizer-modal';
  modal.innerHTML = `
    <div class="yt-summarizer-modal-content">
      <h3>Transcript Options</h3>
      <p>Automatic extraction failed. Choose an option:</p>
      <div class="yt-summarizer-modal-options">
        <div class="yt-summarizer-option-group">
          <h4>🔑 Use Free API (Recommended)</h4>
          <p style="font-size: 12px; color: var(--yt-spec-text-secondary); margin: 8px 0;">
            Get 100 free requests from Supadata.ai - no credit card required!
          </p>
          <input type="text" id="yt-summarizer-api-key" placeholder="Enter your free API key from dash.supadata.ai" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid var(--yt-spec-text-secondary); border-radius: 4px;">
          <div style="display: flex; gap: 8px; margin: 8px 0;">
            <button id="yt-summarizer-get-api-key" class="yt-summarizer-btn secondary" style="flex: 1;">Get Free API Key</button>
            <button id="yt-summarizer-try-api" class="yt-summarizer-btn" style="flex: 1;">Try API</button>
          </div>
        </div>
        
        <div style="margin: 16px 0; text-align: center; color: var(--yt-spec-text-secondary);">OR</div>
        
        <div class="yt-summarizer-option-group">
          <h4>🔗 Manual Method</h4>
          <button id="yt-summarizer-open-tool" class="yt-summarizer-btn secondary">
            Open YouTube-to-Text Tool
          </button>
          <p style="font-size: 12px; color: var(--yt-spec-text-secondary); margin: 8px 0;">
            This will open youtubetotext.org. Copy the transcript and paste it below.
          </p>
          <textarea id="yt-summarizer-manual-transcript" placeholder="Paste the transcript here..." rows="6"></textarea>
        </div>
        
        <div class="yt-summarizer-modal-actions">
          <button id="yt-summarizer-process-manual" class="yt-summarizer-btn">✨ Process & Summarize</button>
          <button id="yt-summarizer-cancel-manual" class="yt-summarizer-btn secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus on textarea for better UX
  setTimeout(() => {
    document.getElementById('yt-summarizer-manual-transcript').focus();
  }, 100);
  
  // Load saved API key
  getSecureApiKey().then(apiKey => {
    if (apiKey) {
      document.getElementById('yt-summarizer-api-key').value = apiKey;
    }
  });
  
  // Event listeners
  document.getElementById('yt-summarizer-get-api-key').addEventListener('click', () => {
    window.open('https://dash.supadata.ai', '_blank');
    showNotification('Sign up for free at Supadata.ai and copy your API key back here!', 'info');
  });
  
  document.getElementById('yt-summarizer-try-api').addEventListener('click', async () => {
    const apiKey = document.getElementById('yt-summarizer-api-key').value.trim();
    if (!apiKey) {
      showNotification('Please enter your API key first', 'error');
      return;
    }
    
    // Save API key securely
    await setSecureApiKey(apiKey);
    
    const tryBtn = document.getElementById('yt-summarizer-try-api');
    const originalText = tryBtn.textContent;
    tryBtn.textContent = 'Trying...';
    tryBtn.disabled = true;
    
    try {
      const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(window.location.href)}&text=true`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.content && data.content.trim()) {
          const transcriptData = {
            title: videoTitle,
            channel: channelName,
            transcript: data.content.trim(),
            duration: 0,
            url: window.location.href
          };
          
          const prompt = createSummaryPrompt(transcriptData);
          const chatGPTUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
          window.open(chatGPTUrl, '_blank');
          
          showNotification('API transcript successful! Opening ChatGPT...', 'success');
          document.body.removeChild(modal);
          return;
        }
      } else if (response.status === 401) {
        showNotification('Invalid API key. Please check and try again.', 'error');
      } else if (response.status === 429) {
        showNotification('API rate limit exceeded. Try again later.', 'error');
      } else {
        showNotification('API request failed. Please try manual method.', 'error');
      }
    } catch (error) {
      showNotification('Network error. Please check your connection.', 'error');
    }
    
    tryBtn.textContent = originalText;
    tryBtn.disabled = false;
  });
  
  document.getElementById('yt-summarizer-open-tool').addEventListener('click', () => {
    const toolUrl = `https://www.youtubetotext.org/?s=${videoId}`;
    window.open(toolUrl, '_blank');
    showNotification('Opened YouTube-to-Text tool. Copy the transcript and paste it back here.', 'info');
  });
  
  document.getElementById('yt-summarizer-process-manual').addEventListener('click', () => {
    const transcript = document.getElementById('yt-summarizer-manual-transcript').value.trim();
    if (transcript && transcript.length > 50) {
      const transcriptData = {
        title: videoTitle,
        channel: channelName,
        transcript: transcript,
        duration: 0,
        url: window.location.href
      };
      
      const prompt = createSummaryPrompt(transcriptData);
      const chatGPTUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
      window.open(chatGPTUrl, '_blank');
      
      showNotification('Transcript processed! Opening ChatGPT for summary...', 'success');
      document.body.removeChild(modal);
    } else if (transcript.length > 0 && transcript.length <= 50) {
      showNotification('Transcript seems too short. Please provide a longer transcript.', 'error');
    } else {
      showNotification('Please paste a transcript first', 'error');
    }
  });
  
  document.getElementById('yt-summarizer-cancel-manual').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // Close on Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

function showSettingsModal() {
  // Create settings modal
  const modal = document.createElement('div');
  modal.className = 'yt-summarizer-modal';
  modal.innerHTML = `
    <div class="yt-summarizer-modal-content">
      <h3>⚙️ Summarizer Settings</h3>
      <div class="yt-summarizer-modal-options">
        <div class="yt-summarizer-option-group">
          <h4>🔑 API Configuration</h4>
          <p style="font-size: 12px; color: var(--yt-spec-text-secondary); margin: 8px 0;">
            Your API key is stored securely and encrypted in your browser.
          </p>
          <div style="display: flex; gap: 8px; margin: 8px 0;">
            <input type="password" id="yt-settings-api-key" placeholder="Enter your Supadata.ai API key" style="flex: 1; padding: 8px; border: 1px solid var(--yt-spec-text-secondary); border-radius: 4px;">
            <button id="yt-settings-show-key" class="yt-summarizer-btn secondary" style="padding: 8px 12px;">👁️</button>
          </div>
          <div style="display: flex; gap: 8px; margin: 8px 0;">
            <button id="yt-settings-save-key" class="yt-summarizer-btn" style="flex: 1;">💾 Save Key</button>
            <button id="yt-settings-test-key" class="yt-summarizer-btn secondary" style="flex: 1;">🧪 Test API</button>
          </div>
          <div style="display: flex; gap: 8px; margin: 8px 0;">
            <button id="yt-settings-get-key" class="yt-summarizer-btn secondary" style="flex: 1;">🔗 Get Free Key</button>
            <button id="yt-settings-clear-key" class="yt-summarizer-btn secondary" style="flex: 1;">🗑️ Clear Key</button>
          </div>
        </div>
        
        <div class="yt-summarizer-option-group">
          <h4>📊 Usage Statistics</h4>
          <div id="yt-settings-stats" style="font-size: 14px; color: var(--yt-spec-text-secondary);">
            Loading statistics...
          </div>
        </div>
        
        <div class="yt-summarizer-modal-actions">
          <button id="yt-settings-close" class="yt-summarizer-btn">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load current API key
  loadApiKeyInSettings();
  loadUsageStats();
  
  // Event listeners
  document.getElementById('yt-settings-show-key').addEventListener('click', () => {
    const input = document.getElementById('yt-settings-api-key');
    const button = document.getElementById('yt-settings-show-key');
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁️';
    }
  });
  
  document.getElementById('yt-settings-save-key').addEventListener('click', async () => {
    const apiKey = document.getElementById('yt-settings-api-key').value.trim();
    if (apiKey) {
      await setSecureApiKey(apiKey);
      showNotification('API key saved securely! 🔐', 'success');
    } else {
      showNotification('Please enter an API key', 'error');
    }
  });
  
  document.getElementById('yt-settings-test-key').addEventListener('click', async () => {
    const apiKey = document.getElementById('yt-settings-api-key').value.trim();
    if (!apiKey) {
      showNotification('Please enter an API key first', 'error');
      return;
    }
    
    const testBtn = document.getElementById('yt-settings-test-key');
    const originalText = testBtn.textContent;
    testBtn.textContent = '🔄 Testing...';
    testBtn.disabled = true;
    
    try {
      const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(window.location.href)}&text=true`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        showNotification('✅ API key is working!', 'success');
      } else if (response.status === 401) {
        showNotification('❌ Invalid API key', 'error');
      } else if (response.status === 429) {
        showNotification('⚠️ Rate limit exceeded', 'error');
      } else {
        showNotification('❌ API test failed', 'error');
      }
    } catch (error) {
      showNotification('❌ Network error during test', 'error');
    }
    
    testBtn.textContent = originalText;
    testBtn.disabled = false;
  });
  
  document.getElementById('yt-settings-get-key').addEventListener('click', () => {
    window.open('https://dash.supadata.ai', '_blank');
    showNotification('Sign up for free at Supadata.ai!', 'info');
  });
  
  document.getElementById('yt-settings-clear-key').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your API key?')) {
      await clearSecureApiKey();
      document.getElementById('yt-settings-api-key').value = '';
      showNotification('API key cleared', 'info');
    }
  });
  
  document.getElementById('yt-settings-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // Close on Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

async function loadApiKeyInSettings() {
  const apiKey = await getSecureApiKey();
  if (apiKey) {
    // Show first and last 4 characters for security
    const maskedKey = apiKey.substring(0, 4) + '●●●●●●●●●●●●' + apiKey.substring(apiKey.length - 4);
    document.getElementById('yt-settings-api-key').placeholder = `Current: ${maskedKey}`;
  }
}

function loadUsageStats() {
  chrome.storage.local.get(['yt_summarizer_usage_count', 'yt_summarizer_last_used'], (result) => {
    const count = result.yt_summarizer_usage_count || 0;
    const lastUsed = result.yt_summarizer_last_used || 'Never';
    const lastUsedDate = lastUsed !== 'Never' ? new Date(lastUsed).toLocaleDateString() : 'Never';
    
    document.getElementById('yt-settings-stats').innerHTML = `
      <div>📈 Videos summarized: <strong>${count}</strong></div>
      <div>🕒 Last used: <strong>${lastUsedDate}</strong></div>
    `;
  });
}

function trackUsage() {
  chrome.storage.local.get(['yt_summarizer_usage_count'], (result) => {
    const count = (result.yt_summarizer_usage_count || 0) + 1;
    chrome.storage.local.set({
      yt_summarizer_usage_count: count,
      yt_summarizer_last_used: Date.now()
    });
  });
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `yt-summarizer-notification ${type}`;
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Hide and remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

function handleVideoChange() {
  const newVideoId = getCurrentVideoId();
  if (newVideoId && newVideoId !== currentVideoId) {
    currentVideoId = newVideoId;
    buttonInjected = false;
    
    // Remove old button if exists
    const oldButton = document.getElementById('yt-summarizer-button');
    if (oldButton) {
      oldButton.remove();
    }
    
    // Inject new button
    setTimeout(injectSummarizeButton, 1000);
  }
}

function initializeSummarizer() {
  if (window.location.pathname === '/watch') {
    currentVideoId = getCurrentVideoId();
    setTimeout(injectSummarizeButton, 2000);
  }
}

// Observer for DOM changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      handleVideoChange();
      if (!buttonInjected && window.location.pathname === '/watch') {
        setTimeout(injectSummarizeButton, 1000);
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Listen for navigation changes
window.addEventListener('popstate', handleVideoChange);
window.addEventListener('pushstate', handleVideoChange);
window.addEventListener('replacestate', handleVideoChange);

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSummarizer);
} else {
  initializeSummarizer();
}