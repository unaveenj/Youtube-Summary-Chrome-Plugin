let buttonInjected = false;
let currentVideoId = null;
let summaryContainer = null;

// Extension lifecycle management
function isExtensionContextValid() {
  try {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id && 
           chrome.storage && 
           chrome.storage.local;
  } catch (error) {
    console.warn('Extension context check failed:', error);
    return false;
  }
}

function checkExtensionContext() {
  if (!isExtensionContextValid()) {
    throw new Error('Extension not properly loaded. Please refresh this page and try again.');
  }
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
  
  // Create container for button
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
  summarizerButton.title = 'Generate AI summary of this video';
  summarizerButton.addEventListener('click', handleSummarizeClick);
  
  // Add button to container
  buttonContainer.appendChild(summarizerButton);
  
  // Insert container into actions
  actionsContainer.appendChild(buttonContainer);
  buttonInjected = true;
}

async function extractTranscriptWithSupadata() {
  return new Promise((resolve, reject) => {
    try {
      // Check extension context first
      checkExtensionContext();
      chrome.storage.local.get(['supadata_api_key'], async (result) => {
        // Check for Chrome runtime error with better messaging
        if (chrome.runtime?.lastError) {
          console.error('Chrome storage error:', chrome.runtime.lastError);
          reject(`Storage error: ${chrome.runtime.lastError.message}. Please refresh the page.`);
          return;
        }

        const apiKey = result?.supadata_api_key;
        
        if (!apiKey) {
          reject('Supadata API key not configured. Please set it in the extension popup.');
          return;
        }

      const videoId = getCurrentVideoId();
      if (!videoId) {
        reject('Could not extract video ID from current URL.');
        return;
      }

      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout

      try {
        const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key. Please check your Supadata API key.');
          } else if (response.status === 403) {
            throw new Error('API key has insufficient permissions.');
          } else if (response.status === 404) {
            throw new Error('No transcript available for this video.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          } else if (response.status >= 500) {
            throw new Error('Supadata server error. Please try again later.');
          } else {
            // Get detailed error message
            let errorMessage = `API error: ${response.status} ${response.statusText}`;
            try {
              const errorText = await response.text();
              if (errorText) {
                errorMessage += ` - ${errorText}`;
              }
            } catch (e) {
              // Ignore parsing errors
            }
            throw new Error(errorMessage);
          }
        }

        const data = await response.json();
        
        if (!data.content || data.content.length === 0) {
          reject('No transcript data received from API.');
          return;
        }

        // Get video metadata
        const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string')?.textContent || 'Unknown';
        const channelName = document.querySelector('#channel-name a')?.textContent || 'Unknown';
        
        resolve({
          title: videoTitle,
          channel: channelName,
          transcript: data.content,
          duration: 0,
          url: window.location.href
        });

      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          reject('Request timeout - API took too long to respond. Please try again.');
        } else if (error?.message?.includes('fetch')) {
          reject('Network error - please check your internet connection and try again.');
        } else {
          reject(`Supadata API error: ${error?.message || error?.toString() || 'Unknown error'}`);
        }
      }
      });
    } catch (error) {
      console.error('Extension error in extractTranscriptWithSupadata:', error);
      reject(error?.message || 'Extension error. Please refresh the page.');
    }
  });
}

async function generateSummaryWithOpenRouter(transcript, videoData) {
  return new Promise((resolve, reject) => {
    try {
      // Check extension context first
      checkExtensionContext();
      chrome.storage.local.get(['openrouter_api_key'], async (result) => {
        // Check for Chrome runtime error with better messaging
        if (chrome.runtime?.lastError) {
          console.error('Chrome storage error:', chrome.runtime.lastError);
          reject(`Storage error: ${chrome.runtime.lastError.message}. Please refresh the page.`);
          return;
        }

        const apiKey = result?.openrouter_api_key;
        
        if (!apiKey) {
          reject('OpenRouter API key not configured. Please set it in the extension popup.');
          return;
        }

        // Create the prompt for summarization
        const prompt = `Please analyze and summarize this YouTube video transcript. Provide a comprehensive summary with key insights.

**Video Title:** ${videoData.title}
**Channel:** ${videoData.channel}
**URL:** ${videoData.url}

**Transcript:**
${transcript}

Please provide:
1. **Main Topic/Theme** - What is this video primarily about?
2. **Key Points** - The most important points discussed (3-5 bullet points)
3. **Important Insights** - Key takeaways or conclusions
4. **Actionable Information** - Any practical advice, recommendations, or steps mentioned

Keep the summary comprehensive but well-organized and easy to read.`;

        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 45000); // 45 second timeout for AI generation

        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-20b:free',
              messages: [{ 
                role: 'user', 
                content: prompt 
              }],
              max_tokens: 1000,
              temperature: 0.7
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Invalid OpenRouter API key. Please check your API key.');
            } else if (response.status === 403) {
              throw new Error('OpenRouter API key has insufficient permissions.');
            } else if (response.status === 429) {
              throw new Error('Rate limit exceeded. Please try again later.');
            } else if (response.status >= 500) {
              throw new Error('OpenRouter server error. Please try again later.');
            } else {
              // Get detailed error message
              let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
              try {
                const errorText = await response.text();
                if (errorText) {
                  errorMessage += ` - ${errorText}`;
                }
              } catch (e) {
                // Ignore parsing errors
              }
              throw new Error(errorMessage);
            }
          }

          const data = await response.json();
          
          if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            reject('No summary generated. Please try again.');
            return;
          }

          resolve(data.choices[0].message.content);

        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error.name === 'AbortError') {
            reject('Summary generation timeout - please try again.');
          } else if (error?.message?.includes('fetch')) {
            reject('Network error - please check your internet connection and try again.');
          } else {
            reject(`OpenRouter API error: ${error?.message || error?.toString() || 'Unknown error'}`);
          }
        }
      });
    } catch (error) {
      console.error('Extension error in generateSummaryWithOpenRouter:', error);
      reject(error?.message || 'Extension error. Please refresh the page.');
    }
  });
}

function createSummaryUI() {
  // Remove any existing summary container
  if (summaryContainer) {
    summaryContainer.remove();
    summaryContainer = null;
  }

  // Create the main floating container
  summaryContainer = document.createElement('div');
  summaryContainer.className = 'yt-summary-container';
  summaryContainer.innerHTML = `
    <div class="yt-summary-header" id="summary-header">
      <h3 class="yt-summary-title">
        <div class="yt-summary-icon">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        AI Summary
      </h3>
      <div class="yt-summary-window-controls">
        <button class="yt-summary-control-btn yt-summary-minimize-btn" id="minimize-btn" title="Minimize">−</button>
        <button class="yt-summary-control-btn yt-summary-close-btn" id="close-btn" title="Close">×</button>
      </div>
    </div>
    <div class="yt-summary-content" id="summary-content">
      <div class="yt-summary-loading">
        <div class="yt-summary-spinner"></div>
        <p class="yt-summary-loading-text">Extracting transcript and generating summary...</p>
      </div>
    </div>
  `;

  // Add floating window directly to body for fixed positioning
  document.body.appendChild(summaryContainer);

  // Add drag functionality
  makeDraggable(summaryContainer);

  // Add event listeners for window controls
  setupWindowControls();

  return summaryContainer;
}

function makeDraggable(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  const header = element.querySelector('#summary-header');
  
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.closest('.yt-summary-window-controls')) {
      return; // Don't drag if clicking on control buttons
    }
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
      header.style.cursor = 'grabbing';
    }
  }

  function dragMove(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      // Keep within viewport bounds
      const rect = element.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      xOffset = Math.max(0, Math.min(xOffset, maxX));
      yOffset = Math.max(0, Math.min(yOffset, maxY));

      element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    header.style.cursor = 'move';
  }
}

function setupWindowControls() {
  const minimizeBtn = document.getElementById('minimize-btn');
  const closeBtn = document.getElementById('close-btn');

  minimizeBtn.addEventListener('click', toggleMinimize);
  closeBtn.addEventListener('click', closeSummaryWindow);
}

function toggleMinimize() {
  if (!summaryContainer) return;
  
  const isMinimized = summaryContainer.classList.contains('minimized');
  
  if (isMinimized) {
    summaryContainer.classList.remove('minimized');
    document.getElementById('minimize-btn').textContent = '−';
    document.getElementById('minimize-btn').title = 'Minimize';
  } else {
    summaryContainer.classList.add('minimized');
    document.getElementById('minimize-btn').textContent = '□';
    document.getElementById('minimize-btn').title = 'Maximize';
  }
}

function closeSummaryWindow() {
  if (summaryContainer) {
    summaryContainer.style.animation = 'floatOut 0.3s ease-in forwards';
    setTimeout(() => {
      if (summaryContainer) {
        summaryContainer.remove();
        summaryContainer = null;
      }
    }, 300);
  }
}

function displaySummary(summary, videoData) {
  if (!summaryContainer) return;

  const contentDiv = summaryContainer.querySelector('#summary-content');
  if (!contentDiv) return;

  // Format the summary with ASCII art and better structure
  const formattedSummary = formatSummaryWithASCII(summary, videoData);

  contentDiv.innerHTML = `
    <div class="yt-summary-text">${formattedSummary}</div>
    <div class="yt-summary-actions">
      <button class="yt-summary-action-btn" onclick="copySummaryToClipboard()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        Copy
      </button>
      <button class="yt-summary-action-btn" onclick="shareSummary()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
        </svg>
        Share
      </button>
    </div>
  `;

  // Store the summary data for sharing/copying
  window.ytSummaryData = {
    summary: summary,
    videoData: videoData
  };
}

function formatSummaryWithASCII(summary, videoData) {
  // ASCII art dividers
  const dividers = {
    header: '╔══════════════════════════════════════╗',
    footer: '╚══════════════════════════════════════╝',
    section: '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫',
    bullet: '•'
  };

  let formattedText = `<div class="yt-summary-ascii">${dividers.header}</div>\n`;
  formattedText += `<div class="yt-summary-section-title">🎥 VIDEO SUMMARY</div>\n`;
  formattedText += `<strong>${videoData.title}</strong>\n`;
  formattedText += `<span style="opacity: 0.7;">by ${videoData.channel}</span>\n\n`;

  // Parse and format the AI summary
  const sections = parseSummaryIntoSections(summary);
  
  sections.forEach((section, index) => {
    if (index > 0) {
      formattedText += `<div class="yt-summary-ascii">${dividers.section}</div>\n`;
    }
    
    formattedText += `<div class="yt-summary-section-title">${section.title}</div>\n`;
    
    if (section.content) {
      // Format bullet points
      const formattedContent = section.content
        .split('\n')
        .map(line => {
          line = line.trim();
          if (!line) return '';
          
          // Check if it's a bullet point
          if (line.match(/^[•\-\*\d\.]/)) {
            return `<div class="yt-summary-bullet-item">${line.replace(/^[•\-\*\d\.\s]*/, '')}</div>`;
          } else {
            return `<div style="margin: 8px 0;">${line}</div>`;
          }
        })
        .filter(line => line)
        .join('\n');
      
      formattedText += formattedContent + '\n\n';
    }
  });

  formattedText += `<div class="yt-summary-ascii">${dividers.footer}</div>`;
  
  return formattedText;
}

function parseSummaryIntoSections(summary) {
  const sections = [];
  
  // Common section headers to look for
  const sectionHeaders = [
    { pattern: /(?:main\s+topic|theme|overview|subject)/i, title: '🎯 MAIN TOPIC' },
    { pattern: /(?:key\s+points|main\s+points|important\s+points)/i, title: '📌 KEY POINTS' },
    { pattern: /(?:insights|takeaways|conclusions)/i, title: '💡 KEY INSIGHTS' },
    { pattern: /(?:actionable|recommendations|advice|steps)/i, title: '⚡ ACTION ITEMS' },
    { pattern: /(?:summary|conclusion)/i, title: '📝 SUMMARY' }
  ];

  // Split by common patterns
  let currentSection = { title: '📋 CONTENT', content: '' };
  const lines = summary.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is a section header
    let matchedHeader = null;
    for (const header of sectionHeaders) {
      if (header.pattern.test(line) && line.length < 100) {
        matchedHeader = header;
        break;
      }
    }
    
    if (matchedHeader) {
      // Save current section if it has content
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = { title: matchedHeader.title, content: '' };
    } else if (line) {
      currentSection.content += line + '\n';
    }
  }
  
  // Add the last section
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  // If no sections were found, create a single content section
  if (sections.length === 0) {
    sections.push({ title: '📋 SUMMARY', content: summary });
  }
  
  return sections;
}

function displayError(errorMessage) {
  if (!summaryContainer) return;

  const contentDiv = summaryContainer.querySelector('#summary-content');
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="yt-summary-text" style="color: #ff4444; text-align: center;">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="margin-bottom: 8px;">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p style="font-size: 14px; margin-top: 16px;">
        <button class="yt-summary-action-btn" onclick="retrySummary()" style="margin: 0 auto;">
          Try Again
        </button>
      </p>
    </div>
  `;
}

async function handleSummarizeClick() {
  try {
    // Check extension context first
    if (!isExtensionContextValid()) {
      showNotification('🔄 Extension context lost. Please refresh the page and try again.', 'error');
      return;
    }

    const button = document.getElementById('yt-summarizer-button');
    const originalText = button.innerHTML;
    
    // Reset button function with delay
    const resetButton = (delay = 2000) => {
      setTimeout(() => {
        if (button) {
          button.innerHTML = originalText;
          button.disabled = false;
        }
      }, delay);
    };

    // Show loading state
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" class="spinning">
        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
      </svg>
      <span>Processing...</span>
    `;
    button.disabled = true;

    // Create the summary UI
    createSummaryUI();
    
    try {
      // Step 1: Extract transcript
      const loadingText = summaryContainer.querySelector('.yt-summary-loading-text');
      if (loadingText) {
        loadingText.textContent = 'Extracting video transcript...';
      }
      
      const transcriptData = await extractTranscriptWithRetry();
      
      // Step 2: Generate summary
      if (loadingText) {
        loadingText.textContent = 'Generating AI summary...';
      }
      
      const summary = await generateSummaryWithOpenRouter(transcriptData.transcript, transcriptData);
      
      // Step 3: Display the summary
      displaySummary(summary, transcriptData);
      
      // Track usage
      trackUsage();
      
      showNotification('✨ Summary generated successfully!', 'success');
      resetButton(1000);
      
    } catch (error) {
      console.error('Error in summary generation:', error);
      
      // Safe error message extraction
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      
      displayError(errorMessage);
      
      // Show specific error notifications with better messaging
      if (errorMessage.includes('not properly loaded')) {
        showNotification('🔄 Extension needs refresh. Please reload this page and try again.', 'error');
      } else if (errorMessage.includes('API key not configured')) {
        showNotification('⚙️ Please configure your API keys in extension settings', 'error');
      } else if (errorMessage.includes('No transcript available')) {
        showNotification('📺 This video doesn\'t have a transcript available', 'error');
      } else if (errorMessage.includes('timeout')) {
        showNotification('⏱️ Request timeout. Please try again.', 'error');
      } else if (errorMessage.includes('Storage error')) {
        showNotification('🔄 Storage error. Please refresh the page and try again.', 'error');
      } else {
        showNotification(`❌ ${errorMessage}`, 'error');
      }
      
      resetButton();
    }
  } catch (outerError) {
    console.error('Unexpected error in handleSummarizeClick:', outerError);
    
    // Ensure button is reset
    const button = document.getElementById('yt-summarizer-button');
    if (button) {
      button.disabled = false;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Summarize</span>
      `;
    }
    
    showNotification('❌ Unexpected error occurred', 'error');
  }
}

// Global functions for UI interactions

window.copySummaryToClipboard = function() {
  if (!window.ytSummaryData) return;
  
  const textToCopy = `${window.ytSummaryData.videoData.title}\nby ${window.ytSummaryData.videoData.channel}\n\n${window.ytSummaryData.summary}`;
  
  copyToClipboard(textToCopy).then(() => {
    showNotification('📋 Summary copied to clipboard!', 'success');
  }).catch(() => {
    showNotification('❌ Failed to copy to clipboard', 'error');
  });
};

window.shareSummary = function() {
  if (!window.ytSummaryData) return;
  
  const shareText = `Check out this AI summary of "${window.ytSummaryData.videoData.title}" by ${window.ytSummaryData.videoData.channel}:\n\n${window.ytSummaryData.summary}\n\nWatch: ${window.ytSummaryData.videoData.url}`;
  
  if (navigator.share) {
    navigator.share({
      title: `AI Summary: ${window.ytSummaryData.videoData.title}`,
      text: shareText,
      url: window.ytSummaryData.videoData.url,
    }).catch(() => {
      // Fallback to clipboard
      copyToClipboard(shareText).then(() => {
        showNotification('📋 Share text copied to clipboard!', 'success');
      });
    });
  } else {
    // Fallback to clipboard
    copyToClipboard(shareText).then(() => {
      showNotification('📋 Share text copied to clipboard!', 'success');
    }).catch(() => {
      showNotification('❌ Failed to copy share text', 'error');
    });
  }
};

window.retrySummary = function() {
  handleSummarizeClick();
};

// Retry mechanism for API calls
async function extractTranscriptWithRetry(maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await extractTranscriptWithSupadata();
    } catch (error) {
      lastError = error;
      console.log(`Retry attempt ${attempt}, error:`, error);
      
      // Don't retry for certain errors
      try {
        const errorMsg = error?.message || error?.toString() || String(error) || '';
        if (errorMsg.includes('API key') || 
            errorMsg.includes('No transcript available') ||
            errorMsg.includes('Rate limit') ||
            errorMsg.includes('permissions')) {
          throw error;
        }
      } catch (checkError) {
        console.warn('Error while checking error message:', checkError);
        throw error;
      }
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// Enhanced clipboard copy function
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    // Method 1: Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        resolve();
      }).catch((error) => {
        // Fallback to Method 2
        fallbackCopyMethod(text, resolve, reject);
      });
    } else {
      // Fallback to Method 2
      fallbackCopyMethod(text, resolve, reject);
    }
  });
}

function fallbackCopyMethod(text, resolve, reject) {
  try {
    // Method 2: Create temporary textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Try execCommand
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      resolve();
    } else {
      reject(new Error('Fallback copy failed'));
    }
  } catch (error) {
    reject(error);
  }
}

function trackUsage() {
  // Check if Chrome extension API is available with better error handling
  if (!isExtensionContextValid()) {
    console.warn('Extension context not valid, cannot track usage');
    return;
  }

  try {
    chrome.storage.local.get(['yt_summarizer_usage_count'], (result) => {
      if (chrome.runtime?.lastError) {
        console.warn('Could not track usage:', chrome.runtime.lastError.message);
        return;
      }

      const count = (result?.yt_summarizer_usage_count || 0) + 1;
      chrome.storage.local.set({
        yt_summarizer_usage_count: count,
        yt_summarizer_last_used: Date.now()
      }, () => {
        if (chrome.runtime?.lastError) {
          console.warn('Could not save usage tracking:', chrome.runtime.lastError.message);
        }
      });
    });
  } catch (error) {
    console.warn('Extension error in trackUsage:', error?.message || error);
  }
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
    
    // Remove old summary container if exists
    if (summaryContainer) {
      summaryContainer.remove();
      summaryContainer = null;
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