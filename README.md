# AI Field Assistant Chrome Extension

A Chrome MV3 extension that automatically fills web form fields using AI based on page context when triggered by specific response headers.

## Features

- 🤖 **Auto-trigger**: Activates when detecting `X-AI-Assist: on` response header
- 📝 **Context Collection**: Gathers data from elements marked with `data-ai-context`
- 🎯 **Precise Filling**: Fills only specified form fields based on configuration
- 🔧 **Mock Mode**: Works without AI endpoint for testing
- ⚙️ **Flexible Config**: Supports both header and page-level configuration
- 🔒 **Secure**: HTTPS-only, whitelist domains, API key protection

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your browser toolbar

## Configuration

### Extension Settings

1. Click the extension icon and select "Open Settings"
2. Configure your AI endpoint URL (optional - leave blank for Mock mode)
3. Add your API key if required by your AI service
4. Save settings

### Webpage Integration

To trigger the extension, your webpage must include the response header:

```
X-AI-Assist: on
```

#### Configuration Methods

**Method 1: Response Header (for short configs)**
```
X-AI-Config: <base64url-encoded-json>
```

**Method 2: Page Script (recommended for larger configs)**
```html
<script type="application/json" id="ai-config">
{
  "prompt": "Fill the form based on customer information",
  "targets": [
    {
      "name": "customerName",
      "selector": "#name",
      "type": "text"
    }
  ]
}
</script>
```

#### Context Marking

Mark elements that provide context for the AI:

```html
<div data-ai-context="customer-info">
  <h3>Customer Details</h3>
  <p>Name: John Smith</p>
  <p>Email: john@example.com</p>
</div>
```

## Configuration Schema

```json
{
  "prompt": "Instructions for the AI on how to fill the form",
  "targets": [
    {
      "name": "fieldName",
      "selector": "#css-selector", 
      "type": "text|json"
    }
  ]
}
```

### Configuration Properties

- **prompt**: Instructions sent to the AI
- **targets**: Array of form fields to fill
  - **name**: Unique identifier for the field
  - **selector**: CSS selector to find the form element
  - **type**: "text" for plain text, "json" for JSON data

## Testing

### Using the Example Server

1. Navigate to the `example/` directory
2. Run the test server:
   ```bash
   node simple-server.js
   ```
3. Open `http://localhost:3000` in Chrome
4. The page will automatically trigger the extension

### Mock Mode Testing

If no AI endpoint is configured, the extension uses mock responses:
- Fields will be filled with "Mock content for [fieldName]"
- JSON fields get `{"mock": true, "value": "Mock data for [fieldName]"}`

## AI Endpoint Requirements

Your AI service should accept POST requests with this format:

**Request:**
```json
{
  "prompt": "User-defined instructions",
  "context": {
    "title": "Page title",
    "description": "Meta description",
    "contextBlocks": [
      {
        "label": "context-label",
        "content": "Context content"
      }
    ]
  },
  "targets": [
    {
      "name": "fieldName",
      "selector": "#selector",
      "type": "text"
    }
  ]
}
```

**Response:**
```json
{
  "fieldName": "Generated content",
  "anotherField": "More content"
}
```

## Security Features

- **HTTPS Only**: Extension only works on secure pages
- **Main Frame Only**: Ignores iframe requests
- **Domain Whitelisting**: Can be configured in manifest.json
- **API Key Protection**: Stored locally, sent via background script

## Development

### Project Structure

```
├── manifest.json          # Extension manifest
├── background.js          # Service worker (API calls, header detection)
├── content.js            # Content script (DOM manipulation, context collection)
├── options.html/js       # Settings page
├── popup.html/js         # Extension popup
├── example/              # Test files
│   ├── test-form.html   # Example webpage
│   └── simple-server.js # Test server with headers
└── README.md
```

### Key Functions

- **Header Detection**: `background.js` monitors `webRequest.onHeadersReceived`
- **Context Collection**: `content.js` gathers `data-ai-context` elements
- **Field Filling**: Automated form filling with visual indicators
- **Mock Mode**: Fallback when no AI endpoint configured

## Troubleshooting

### Extension Not Triggering
- Verify the page has `X-AI-Assist: on` response header
- Check that the page is served over HTTPS
- Open DevTools Network tab to confirm headers

### Fields Not Filling
- Ensure CSS selectors in targets are correct
- Check that form elements exist when extension runs
- Verify AI response format matches expected structure

### Mock Mode Issues
- Clear extension settings and reload
- Check console for error messages
- Verify page configuration is valid JSON

## Browser Compatibility

- Chrome MV3 (Manifest Version 3)
- Minimum Chrome version: 88+

## 代辦列表 (TODO)

### 🚀 計劃中的功能改進

- [x] **介面改為側邊欄並支援多重對話**
  - 將現有的彈出視窗介面改為側邊欄形式
  - 實現多個對話會話的管理功能
  - 支援對話歷史記錄和切換
  - 改善使用者體驗和工作流程

- [x] **對話框顯示 JSON 回應並支援選擇性寫入**
  - 在對話框中直接顯示 AI 回應的 JSON 內容
  - 提供使用者預覽和確認機制
  - 允許使用者選擇是否要將資料寫入到伺服器
  - 取代強制性的表單填寫模式，提供更靈活的互動方式

### 📋 其他改進項目

- [x] 支援更多表單元素類型 (select, checkbox, radio)
- [ ] 添加批次處理功能
- [ ] 改善錯誤處理和使用者回饋
- [ ] 支援自訂 AI 模型選擇
- [ ] 添加使用統計和分析功能

## License

MIT License - see LICENSE file for details