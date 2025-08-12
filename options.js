document.addEventListener('DOMContentLoaded', async () => {
  const aiEndpointInput = document.getElementById('aiEndpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const aiModelInput = document.getElementById('aiModel');
  const temperatureInput = document.getElementById('temperature');
  const debugModeInput = document.getElementById('debugMode');
  const saveButton = document.getElementById('saveSettings');
  const clearButton = document.getElementById('clearSettings');
  const testButton = document.getElementById('testConnection');
  const saveStatus = document.getElementById('saveStatus');
  const testStatus = document.getElementById('testStatus');
  const mockNotice = document.getElementById('mockNotice');
  
  await loadSettings();
  
  saveButton.addEventListener('click', saveSettings);
  clearButton.addEventListener('click', clearSettings);
  testButton.addEventListener('click', testConnection);
  
  async function loadSettings() {
    try {
      const settings = await chrome.storage.local.get(['aiEndpoint', 'apiKey', 'aiModel', 'temperature', 'debugMode']);
      
      aiEndpointInput.value = settings.aiEndpoint || '';
      apiKeyInput.value = settings.apiKey || '';
      aiModelInput.value = settings.aiModel || '';
      temperatureInput.value = settings.temperature || '';
      debugModeInput.checked = settings.debugMode || false;
      
      updateMockNotice(settings.aiEndpoint);
    } catch (error) {
      showStatus('Error loading settings: ' + error.message, 'error');
    }
  }
  
  async function saveSettings() {
    try {
      const temperature = temperatureInput.value.trim();
      
      const settings = {
        aiEndpoint: aiEndpointInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        aiModel: aiModelInput.value.trim(),
        temperature: temperature ? parseFloat(temperature) : null,
        debugMode: debugModeInput.checked
      };
      
      if (settings.aiEndpoint && !isValidUrl(settings.aiEndpoint)) {
        showStatus('Please enter a valid URL for the AI endpoint', 'error');
        return;
      }
      
      if (settings.temperature !== null && (settings.temperature < 0 || settings.temperature > 2)) {
        showStatus('Temperature must be between 0.0 and 2.0', 'error');
        return;
      }
      
      await chrome.storage.local.set(settings);
      updateMockNotice(settings.aiEndpoint);
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  }
  
  async function clearSettings() {
    try {
      await chrome.storage.local.clear();
      aiEndpointInput.value = '';
      apiKeyInput.value = '';
      aiModelInput.value = '';
      temperatureInput.value = '';
      debugModeInput.checked = false;
      updateMockNotice('');
      showStatus('Settings cleared successfully!', 'success');
    } catch (error) {
      showStatus('Error clearing settings: ' + error.message, 'error');
    }
  }
  
  function updateMockNotice(endpoint) {
    if (!endpoint) {
      mockNotice.style.display = 'block';
    } else {
      mockNotice.style.display = 'none';
    }
  }
  
  function showStatus(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = `status ${type === 'error' ? 'warning' : 'success'}`;
    saveStatus.style.display = 'block';
    
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 5000);
  }
  
  async function testConnection() {
    const endpoint = aiEndpointInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const model = aiModelInput.value.trim();
    const temperature = temperatureInput.value.trim();
    
    if (!endpoint) {
      showTestStatus('Please enter an AI endpoint URL first', 'error');
      return;
    }
    
    if (!isValidUrl(endpoint)) {
      showTestStatus('Please enter a valid URL', 'error');
      return;
    }
    
    showTestStatus('Testing connection...', 'info');
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    
    // Check if debug mode is enabled
    const settings = await chrome.storage.local.get(['debugMode']);
    const debugMode = settings.debugMode;
    
    if (debugMode) {
      console.log('[AI-Assistant] [CONNECTION_TEST] Starting connection test', {
        endpoint,
        hasApiKey: !!apiKey,
        model: model || 'none',
        temperature: temperature || 'none'
      });
    }
    
    try {
      const content = 'This is a connection test. Please respond with a JSON object containing: {"testField": "Connection successful"}';
      
      const requestBody = {
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        model: model || "openai/gpt-3.5-turbo",
        temperature: temperature ? parseFloat(temperature) : 1,
        top_p: 1
      };
      
      if (debugMode) {
        console.log('[AI-Assistant] [CONNECTION_TEST] Request body prepared', requestBody);
      }
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || ''}`
      };
      
      if (debugMode) {
        console.log('[AI-Assistant] [CONNECTION_TEST] Request headers', {
          ...requestHeaders,
          'Authorization': apiKey ? `Bearer ${apiKey.substring(0, 10)}...` : 'Bearer (empty)'
        });
      }
      
      if (debugMode) {
        console.log('[AI-Assistant] [CONNECTION_TEST] Sending fetch request to:', endpoint);
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });
      
      if (debugMode) {
        console.log('[AI-Assistant] [CONNECTION_TEST] Response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      }
      
      if (!response.ok) {
        let responseText = '';
        try {
          responseText = await response.text();
          if (debugMode) {
            console.log('[AI-Assistant] [CONNECTION_TEST] Error response body:', responseText);
          }
        } catch (textError) {
          if (debugMode) {
            console.log('[AI-Assistant] [CONNECTION_TEST] Could not read error response body:', textError);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}${responseText ? ` - ${responseText}` : ''}`);
      }
      
      const data = await response.json();
      
      if (debugMode) {
        console.log('[AI-Assistant] [CONNECTION_TEST] Response data parsed successfully:', data);
      }
      
      // Check if response has the expected OpenAI/ChatCompletion format
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        if (debugMode) {
          console.log('[AI-Assistant] [CONNECTION_TEST] AI response content:', content);
        }
        
        // Try to verify the AI understood the test request
        if (content && (content.includes('Connection successful') || content.includes('testField'))) {
          showTestStatus('✅ Connection successful! AI endpoint is responding correctly.', 'success');
          if (debugMode) {
            console.log('[AI-Assistant] [CONNECTION_TEST] Test completed successfully');
          }
        } else {
          showTestStatus('⚠️ Connection established but AI response may be unexpected', 'warning');
          if (debugMode) {
            console.warn('[AI-Assistant] [CONNECTION_TEST] AI response content may be unexpected:', content);
          }
        }
      } else if (data && typeof data === 'object') {
        // Fallback for other API formats
        showTestStatus('✅ Connection successful! Endpoint responded with data.', 'success');
        if (debugMode) {
          console.log('[AI-Assistant] [CONNECTION_TEST] Non-OpenAI format but valid response');
        }
      } else {
        showTestStatus('⚠️ Connection established but received unexpected response format', 'warning');
        if (debugMode) {
          console.warn('[AI-Assistant] [CONNECTION_TEST] Unexpected response format:', typeof data, data);
        }
      }
      
    } catch (error) {
      if (debugMode) {
        console.error('[AI-Assistant] [CONNECTION_TEST] Test failed with error:', error);
        console.error('[AI-Assistant] [CONNECTION_TEST] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
        
        // Try to extract additional debugging info
        if (error.name === 'TypeError') {
          console.error('[AI-Assistant] [CONNECTION_TEST] TypeError details - likely network issue');
          if (error.message.includes('fetch')) {
            console.error('[AI-Assistant] [CONNECTION_TEST] Fetch error - possible causes:');
            console.error('- CORS policy blocking request');
            console.error('- Network connectivity issues');
            console.error('- Invalid URL format');
            console.error('- Server not responding');
          }
        }
        
        if (error.message.includes('JSON')) {
          console.error('[AI-Assistant] [CONNECTION_TEST] JSON parsing error - server returned non-JSON response');
        }
        
        // Log current browser environment info
        console.log('[AI-Assistant] [CONNECTION_TEST] Environment info:', {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          onLine: navigator.onLine,
          currentURL: window.location.href
        });
      }
      
      let errorMessage = 'Connection failed: ';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'Network error - check if the endpoint URL is correct and accessible';
        if (debugMode) {
          errorMessage += ' (See console for detailed network debugging info)';
        }
      } else if (error.message.includes('400')) {
        errorMessage += 'Bad request - check your request format';
        if (debugMode) {
          errorMessage += ' (Check console for request details)';
        }
      } else if (error.message.includes('401')) {
        errorMessage += 'Authentication failed - check your API key';
        if (debugMode) {
          errorMessage += ' (API key format and validity logged to console)';
        }
      } else if (error.message.includes('403')) {
        errorMessage += 'Access forbidden - check your permissions';
        if (debugMode) {
          errorMessage += ' (Request headers logged to console)';
        }
      } else if (error.message.includes('404')) {
        errorMessage += 'Endpoint not found - check the URL';
        if (debugMode) {
          errorMessage += ' (Full URL and request details in console)';
        }
      } else if (error.message.includes('500')) {
        errorMessage += 'Server error - the AI service is having issues';
        if (debugMode) {
          errorMessage += ' (Server response body logged to console if available)';
        }
      } else if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
        errorMessage += 'Invalid response format - server did not return valid JSON';
        if (debugMode) {
          errorMessage += ' (Raw response logged to console)';
        }
      } else {
        errorMessage += error.message;
        if (debugMode) {
          errorMessage += ' (Full error details in console)';
        }
      }
      
      showTestStatus(errorMessage, 'error');
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test Connection';
    }
  }
  
  function showTestStatus(message, type) {
    testStatus.innerHTML = message;
    testStatus.className = `status ${type === 'error' ? 'warning' : type === 'info' ? 'warning' : 'success'}`;
    testStatus.style.display = 'block';
    
    if (type !== 'info') {
      setTimeout(() => {
        testStatus.style.display = 'none';
      }, 8000);
    }
  }
  
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
});