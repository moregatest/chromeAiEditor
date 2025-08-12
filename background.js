chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    if (details.type !== 'main_frame') return;
    
    await debugLog('HEADER_DETECTION', 'Checking response headers', {
      url: details.url,
      headers: details.responseHeaders?.map(h => `${h.name}: ${h.value}`) || []
    });
    
    const aiAssistHeader = details.responseHeaders?.find(
      header => header.name.toLowerCase() === 'x-ai-assist'
    );
    
    if (aiAssistHeader?.value === 'on') {
      await debugLog('HEADER_DETECTION', 'AI-Assist header found! Extension activated');
      
      const aiConfigHeader = details.responseHeaders?.find(
        header => header.name.toLowerCase() === 'x-ai-config'
      );
      
      let config = null;
      if (aiConfigHeader?.value) {
        try {
          const decoded = atob(aiConfigHeader.value);
          config = JSON.parse(decoded);
          await debugLog('HEADER_DETECTION', 'X-AI-Config header parsed successfully', config);
        } catch (e) {
          await debugError('HEADER_DETECTION', 'Failed to parse X-AI-Config header', e);
        }
      } else {
        await debugLog('HEADER_DETECTION', 'No X-AI-Config header found, will use page config');
      }
      
      chrome.tabs.sendMessage(details.tabId, {
        type: 'AI_ASSIST_TRIGGER',
        headerConfig: config,
        url: details.url
      }).catch(async () => {
        await debugLog('HEADER_DETECTION', 'First message attempt failed, retrying in 1s');
        setTimeout(() => {
          chrome.tabs.sendMessage(details.tabId, {
            type: 'AI_ASSIST_TRIGGER',
            headerConfig: config,
            url: details.url
          }).catch(() => {});
        }, 1000);
      });
    } else {
      await debugLog('HEADER_DETECTION', 'No AI-Assist header found or not "on"', {
        found: !!aiAssistHeader,
        value: aiAssistHeader?.value
      });
    }
  },
  { urls: ["http://*/*", "https://*/*"] },
  ["responseHeaders"]
);

// Handle extension icon click to open sidebar
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_REQUEST') {
    debugLog('AI_REQUEST', 'Received AI request from content script', message.data);
    
    handleAiRequest(message.data)
      .then(async (response) => {
        await debugLog('AI_REQUEST', 'AI request completed successfully', response);
        sendResponse({ success: true, data: response });
      })
      .catch(async (error) => {
        await debugError('AI_REQUEST', 'AI request failed', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function handleAiRequest(requestData) {
  const settings = await chrome.storage.local.get(['aiEndpoint', 'apiKey', 'aiModel', 'temperature']);
  
  await debugLog('AI_API', 'Processing AI request', {
    endpoint: settings.aiEndpoint,
    hasApiKey: !!settings.apiKey,
    model: settings.aiModel,
    temperature: settings.temperature,
    targetsCount: requestData.targets?.length || 0
  });
  
  if (!settings.aiEndpoint) {
    await debugLog('AI_API', 'No endpoint configured, using mock response');
    return generateMockResponse(requestData.targets);
  }
  
  try {
    // Build the content message for the AI
    let content = requestData.prompt || 'Fill the form fields based on the context';
    
    // Add context information
    if (requestData.context) {
      content += '\n\nPage Context:';
      content += `\nTitle: ${requestData.context.title}`;
      if (requestData.context.description) {
        content += `\nDescription: ${requestData.context.description}`;
      }
      
      if (requestData.context.contextBlocks && requestData.context.contextBlocks.length > 0) {
        content += '\n\nContext Information:';
        requestData.context.contextBlocks.forEach(block => {
          content += `\n- ${block.label}: ${block.content}`;
        });
      }
    }
    
    // Add target field information
    if (requestData.targets && requestData.targets.length > 0) {
      content += '\n\nPlease fill the following fields with appropriate content:';
      requestData.targets.forEach(target => {
        content += `\n- ${target.name} (${target.type})`;
      });
      
      content += '\n\nRespond with a JSON object where keys are the field names and values are the content to fill in those fields.';
    }
    
    const requestBody = {
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      model: settings.aiModel || "openai/gpt-3.5-turbo",
      temperature: settings.temperature !== null && settings.temperature !== undefined ? settings.temperature : 1,
      top_p: 1
    };
    
    await debugLog('AI_API', 'Sending request to AI endpoint', {
      url: settings.aiEndpoint,
      body: requestBody
    });
    
    const response = await fetch(settings.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey || ''}`
      },
      body: JSON.stringify(requestBody)
    });
    
    await debugLog('AI_API', 'AI endpoint response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    await debugLog('AI_API', 'AI response parsed successfully', result);
    
    // Extract the content from the AI response and parse it as the field data
    let aiData = {};
    if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
      try {
        // Try to parse the content as JSON
        const content = result.choices[0].message.content.trim();
        await debugLog('AI_API', 'Extracting content from AI response', content);
        
        // Look for JSON in the response (it might be wrapped in markdown code blocks)
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        } else if (content.includes('{') && content.includes('}')) {
          // Extract JSON object from the response
          const startIndex = content.indexOf('{');
          const endIndex = content.lastIndexOf('}') + 1;
          jsonContent = content.substring(startIndex, endIndex);
        }
        
        aiData = JSON.parse(jsonContent);
        await debugLog('AI_API', 'Successfully parsed AI response content as JSON', aiData);
      } catch (parseError) {
        await debugError('AI_API', 'Failed to parse AI response content as JSON, using fallback', parseError);
        // Fallback: create response based on targets
        if (requestData.targets) {
          requestData.targets.forEach(target => {
            aiData[target.name] = result.choices[0].message.content;
          });
        }
      }
    } else {
      // Fallback for unexpected response format
      await debugLog('AI_API', 'Unexpected AI response format, using fallback');
      aiData = result;
    }
    
    return aiData;
  } catch (error) {
    await debugError('AI_API', 'AI API request failed, falling back to mock', error);
    return generateMockResponse(requestData.targets);
  }
}

async function generateMockResponse(targets) {
  await debugLog('MOCK_RESPONSE', 'Generating mock response for targets', targets);
  
  const mockData = {};
  
  targets.forEach(target => {
    if (target.type === 'json') {
      mockData[target.name] = { mock: true, value: `Mock data for ${target.name}` };
    } else {
      mockData[target.name] = `Mock content for ${target.name}`;
    }
  });
  
  await debugLog('MOCK_RESPONSE', 'Mock response generated', mockData);
  
  return mockData;
}

// Debug helper functions for background script
async function debugLog(context, message, data = null) {
  try {
    const settings = await chrome.storage.local.get(['debugMode']);
    if (settings.debugMode) {
      const timestamp = new Date().toISOString();
      const prefix = `[AI-Assistant] ${timestamp} [${context}]`;
      
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  } catch (error) {
    // Silent fail if storage is not available
  }
}

async function debugError(context, message, error = null) {
  try {
    const settings = await chrome.storage.local.get(['debugMode']);
    if (settings.debugMode) {
      const timestamp = new Date().toISOString();
      const prefix = `[AI-Assistant] ${timestamp} [${context}]`;
      
      if (error) {
        console.error(prefix, message, error);
      } else {
        console.error(prefix, message);
      }
    }
  } catch (storageError) {
    // Silent fail if storage is not available
  }
}