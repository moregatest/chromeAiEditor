# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Field Assistant Chrome Extension (Manifest V3) that automatically fills web form fields using AI based on page context. The extension can be triggered by specific response headers and includes a sidebar interface for multi-conversation management.

## Development Commands

```bash
# Start the test server for development
cd example
node simple-server.js

# Test the extension using the example form
# Navigate to http://localhost:3000 after starting the server
```

No build process or package manager is used - this is a plain JavaScript Chrome extension.

## Testing

- **Local Testing**: Use the example server (`example/simple-server.js`) which serves `test-form.html` with the required `X-AI-Assist: on` header
- **Extension Loading**: Load the extension in Chrome via `chrome://extensions/` with "Developer mode" enabled
- **Mock Mode**: Extension works without AI endpoint configured, returning mock data for testing

## Key Architecture Components

### Extension Entry Points
- **background.js**: Service worker that monitors HTTP headers (`X-AI-Assist: on`) and handles AI API requests
- **content.js**: Content script that processes page context, collects form targets, and fills fields
- **sidebar.js**: Sidebar interface with conversation management (`ConversationManager` class)
- **options.js**: Settings page for AI endpoint configuration

### Core Workflows

1. **Header-Triggered Mode**: Extension activates when `X-AI-Assist: on` response header is detected
2. **Context Collection**: Gathers data from elements marked with `data-ai-context` attribute
3. **Configuration**: Supports both response header config (`X-AI-Config`) and page-based config (`<script id="ai-config">`)
4. **Field Filling**: Automatically fills form fields based on AI response or configuration targets
5. **Conversation Interface**: Sidebar allows multi-turn conversations with AI, showing JSON responses and optional field application

### AI Integration
- Configurable AI endpoint in options.html
- Supports OpenAI-compatible API format with `messages` array
- Falls back to mock mode when no endpoint configured
- Temperature and model selection support

### Data Flow
```
HTTP Response Headers → background.js → content.js → Page Context Collection → AI Request → Field Filling
                                   ↓
                            sidebar.js ← User Interaction ← Conversation Management
```

### Security Features
- HTTPS-only operation
- Main frame only (ignores iframes) 
- API keys stored in Chrome storage
- Domain restrictions via manifest permissions

### Key Field Types Supported
- Text inputs, textareas, selects
- Checkboxes, radio buttons
- JSON data fields (serialized to string)

## Extension Permissions
- `webRequest`: Header monitoring
- `storage`: Settings and conversation persistence  
- `activeTab`: Page interaction
- `sidePanel`: Sidebar interface

## Configuration Schema
The extension expects either header-based or page-based configuration:

```javascript
{
  "prompt": "Instructions for AI",
  "targets": [
    {
      "name": "fieldName",
      "selector": "#css-selector", 
      "type": "text|json|checkbox|radio|select"
    }
  ]
}
```