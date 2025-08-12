document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  
  try {
    const settings = await chrome.storage.local.get(['aiEndpoint', 'apiKey']);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    let statusText = '';
    let statusClass = 'inactive';
    
    if (!settings.aiEndpoint) {
      statusText = '⚠️ Mock Mode Active - Configure AI endpoint in settings';
      statusClass = 'mock';
    } else {
      statusText = '✅ AI endpoint configured';
      statusClass = 'active';
    }
    
    if (tab && !tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      statusText += '<br><small>⚠️ Extension only works on HTTP/HTTPS pages</small>';
    }
    
    statusDiv.innerHTML = statusText;
    statusDiv.className = `status ${statusClass}`;
    
  } catch (error) {
    statusDiv.textContent = '❌ Error checking status';
    statusDiv.className = 'status inactive';
  }
});