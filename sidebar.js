class ConversationManager {
  constructor() {
    this.conversations = new Map();
    this.activeConversationId = null;
    this.renderRetryCount = 0;
    this.maxRenderRetries = 5;
    this.init();
  }

  async init() {
    await this.loadConversations();
    this.setupEventListeners();
    // Delay UI update to ensure DOM is ready
    setTimeout(() => {
      this.updateUI();
    }, 100);
  }

  async loadConversations() {
    try {
      const stored = await chrome.storage.local.get(['conversations', 'activeConversationId']);
      if (stored.conversations) {
        this.conversations = new Map(Object.entries(stored.conversations));
      }
      this.activeConversationId = stored.activeConversationId || null;
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  async saveConversations() {
    try {
      const conversationsObj = Object.fromEntries(this.conversations);
      await chrome.storage.local.set({
        conversations: conversationsObj,
        activeConversationId: this.activeConversationId
      });
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }

  createConversation(title = null) {
    const id = Date.now().toString();
    const conversation = {
      id,
      title: title || `Chat ${this.conversations.size + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.conversations.set(id, conversation);
    this.activeConversationId = id;
    this.saveConversations();
    this.updateUI();
    return id;
  }

  deleteConversation(id) {
    this.conversations.delete(id);
    if (this.activeConversationId === id) {
      const remaining = Array.from(this.conversations.keys());
      this.activeConversationId = remaining.length > 0 ? remaining[0] : null;
    }
    this.saveConversations();
    this.updateUI();
  }

  setActiveConversation(id) {
    if (this.conversations.has(id)) {
      this.activeConversationId = id;
      this.saveConversations();
      this.updateUI();
    }
  }

  addMessage(conversationId, message) {
    if (this.conversations.has(conversationId)) {
      const conversation = this.conversations.get(conversationId);
      conversation.messages.push({
        ...message,
        timestamp: Date.now()
      });
      conversation.updatedAt = Date.now();
      
      // Update title based on first user message
      if (message.sender === 'user' && conversation.messages.length === 1) {
        conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
      }
      
      this.saveConversations();
      this.updateUI();
    }
  }

  getActiveConversation() {
    return this.activeConversationId ? this.conversations.get(this.activeConversationId) : null;
  }

  setupEventListeners() {
    // New chat button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        this.createConversation();
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      });
    }

    // Send message
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    if (messageInput) {
      // Auto-resize textarea
      messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
      });
    }
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
      console.error('messageInput element not found');
      return;
    }
    const content = messageInput.value.trim();
    
    if (!content) return;

    // Create conversation if none exists
    if (!this.activeConversationId) {
      this.createConversation();
    }

    // Add user message
    this.addMessage(this.activeConversationId, {
      sender: 'user',
      content: content
    });

    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Show loading indicator
    this.updateStatus('Sending message...', 'active');

    try {
      // Get current tab info and page context
      let tab = null;
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = tabs[0] || null;
      } catch (tabError) {
        console.warn('Could not get current tab:', tabError);
      }
      
      const response = await this.processMessage(content, tab);
      
      // Add AI response
      this.addMessage(this.activeConversationId, {
        sender: 'ai',
        content: response.content,
        jsonData: response.jsonData,
        targets: response.targets
      });

      this.updateStatus('Ready');
    } catch (error) {
      console.error('Failed to process message:', error);
      this.addMessage(this.activeConversationId, {
        sender: 'ai',
        content: 'Sorry, there was an error processing your request.',
        error: true
      });
      this.updateStatus('Error occurred', 'error');
    }
  }

  async processMessage(content, tab) {
    // Get page context
    const context = await this.getPageContext(tab);
    
    // Use background script to handle AI request
    const requestData = {
      prompt: content,
      context: context,
      targets: context.targets || []
    };

    const aiResponse = await chrome.runtime.sendMessage({
      type: 'AI_REQUEST',
      data: requestData
    });

    if (aiResponse.success) {
      return {
        content: typeof aiResponse.data === 'string' ? aiResponse.data : 'AI response received',
        jsonData: typeof aiResponse.data === 'object' ? aiResponse.data : null,
        targets: context.targets
      };
    } else {
      // Fallback to mock response on error
      return this.generateMockResponse(content, context);
    }
  }

  async getPageContext(tab) {
    if (!tab) {
      return {
        title: 'No active tab',
        description: '',
        contextBlocks: [],
        targets: []
      };
    }

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Get AI configuration
          const configScript = document.getElementById('ai-config');
          let config = {};
          
          if (configScript) {
            try {
              config = JSON.parse(configScript.textContent);
            } catch (e) {
              console.error('Failed to parse AI config:', e);
            }
          }

          // Collect context elements
          const contextElements = document.querySelectorAll('[data-ai-context]');
          const contextBlocks = Array.from(contextElements).map(el => ({
            label: el.getAttribute('data-ai-context'),
            content: el.textContent.trim()
          }));

          return {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            contextBlocks,
            targets: config.targets || [],
            prompt: config.prompt || ''
          };
        }
      });

      return result.result;
    } catch (error) {
      console.error('Failed to get page context:', error);
      return {
        title: tab.title || 'Unknown page',
        description: '',
        contextBlocks: [],
        targets: []
      };
    }
  }

  generateMockResponse(content, context) {
    const mockData = {};
    
    if (context.targets && context.targets.length > 0) {
      context.targets.forEach(target => {
        if (target.type === 'json') {
          mockData[target.name] = {
            mock: true,
            value: `Mock data for ${target.name}`,
            field: target.name
          };
        } else {
          mockData[target.name] = `Mock content for ${target.name}`;
        }
      });
    }

    return {
      content: `Mock AI response to: "${content}"`,
      jsonData: Object.keys(mockData).length > 0 ? mockData : null,
      targets: context.targets
    };
  }

  updateUI() {
    this.renderConversationList();
    this.renderActiveConversation();
  }

  renderConversationList() {
    const conversationList = document.getElementById('conversationList');
    if (!conversationList) {
      console.error('conversationList element not found');
      return;
    }
    conversationList.innerHTML = '';

    const sortedConversations = Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);

    sortedConversations.forEach(conversation => {
      const item = document.createElement('div');
      item.className = `conversation-item ${conversation.id === this.activeConversationId ? 'active' : ''}`;
      
      const time = new Date(conversation.updatedAt).toLocaleDateString();
      
      item.innerHTML = `
        <div class="conversation-title">${conversation.title}</div>
        <div class="conversation-time">${time}</div>
        <button class="conversation-delete" data-conversation-id="${conversation.id}">×</button>
      `;

      item.addEventListener('click', (e) => {
        // Don't switch conversation if delete button was clicked
        if (e.target.classList.contains('conversation-delete')) {
          return;
        }
        this.setActiveConversation(conversation.id);
      });

      // Add delete button event listener
      const deleteBtn = item.querySelector('.conversation-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteConversation(conversation.id);
        });
      }

      conversationList.appendChild(item);
    });
  }

  renderActiveConversation() {
    const chatArea = document.getElementById('chatArea');
    const emptyState = document.getElementById('emptyState');
    
    // Check if elements exist
    if (!chatArea || !emptyState) {
      this.renderRetryCount++;
      if (this.renderRetryCount <= this.maxRenderRetries) {
        console.error(`DOM elements not found (retry ${this.renderRetryCount}/${this.maxRenderRetries}), retrying in 200ms...`);
        console.log('Missing elements:', {
          chatArea: !!chatArea,
          emptyState: !!emptyState
        });
        setTimeout(() => {
          this.renderActiveConversation();
        }, 200);
        return;
      } else {
        console.error('Failed to find DOM elements after maximum retries. Please refresh the sidebar.');
        return;
      }
    }
    
    // Reset retry count on successful element finding
    this.renderRetryCount = 0;
    
    const activeConversation = this.getActiveConversation();
    
    if (!activeConversation || activeConversation.messages.length === 0) {
      try {
        // Clear messages but keep emptyState
        const messages = chatArea.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        emptyState.style.display = 'block';
      } catch (error) {
        console.error('Error showing empty state:', error);
      }
      return;
    }

    try {
      emptyState.style.display = 'none';
      
      // Clear existing messages but keep emptyState
      const messages = chatArea.querySelectorAll('.message');
      messages.forEach(msg => msg.remove());

      activeConversation.messages.forEach(message => {
        const messageEl = this.createMessageElement(message);
        if (messageEl) {
          chatArea.appendChild(messageEl);
        }
      });

      // Scroll to bottom
      chatArea.scrollTop = chatArea.scrollHeight;
    } catch (error) {
      console.error('Error rendering conversation:', error);
    }
  }

  createMessageElement(message) {
    try {
      if (!message || !message.sender || !message.content) {
        console.error('Invalid message object:', message);
        return null;
      }

      const messageEl = document.createElement('div');
      messageEl.className = `message ${message.sender}`;

      const time = new Date(message.timestamp || Date.now()).toLocaleTimeString();
      
      let contentHtml = `<div class="message-content">${this.escapeHtml(message.content)}</div>`;
      
      if (message.jsonData) {
        try {
          contentHtml += `<div class="json-response">${JSON.stringify(message.jsonData, null, 2)}</div>`;
          contentHtml += `
            <div class="response-actions">
              <button class="btn copy-json-btn" data-json='${this.escapeHtml(JSON.stringify(message.jsonData))}'>Copy JSON</button>
              <button class="btn btn-primary apply-to-page-btn" data-timestamp="${message.timestamp}">Apply to Page</button>
              <button class="btn preview-changes-btn" data-timestamp="${message.timestamp}">Preview</button>
            </div>
          `;
        } catch (jsonError) {
          console.error('Error processing JSON data:', jsonError);
          contentHtml += `<div class="error-message">Error displaying JSON data</div>`;
        }
      }

      messageEl.innerHTML = `
        <div class="message-header">
          <span class="message-sender">${message.sender === 'user' ? 'You' : 'AI'}</span>
          <span class="message-time">${time}</span>
        </div>
        ${contentHtml}
      `;

      // Add event listeners for action buttons
      if (message.jsonData) {
        try {
          const copyBtn = messageEl.querySelector('.copy-json-btn');
          const applyBtn = messageEl.querySelector('.apply-to-page-btn');
          const previewBtn = messageEl.querySelector('.preview-changes-btn');

          if (copyBtn) {
            copyBtn.addEventListener('click', () => {
              this.copyToClipboard(copyBtn.dataset.json);
            });
          }

          if (applyBtn) {
            applyBtn.addEventListener('click', () => {
              this.applyToPage(applyBtn.dataset.timestamp);
            });
          }

          if (previewBtn) {
            previewBtn.addEventListener('click', () => {
              this.previewChanges(previewBtn.dataset.timestamp);
            });
          }
        } catch (eventError) {
          console.error('Error adding event listeners:', eventError);
        }
      }

      return messageEl;
    } catch (error) {
      console.error('Error creating message element:', error);
      return null;
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.updateStatus('Copied to clipboard', 'active');
      setTimeout(() => this.updateStatus('Ready'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  async applyToPage(messageTimestamp) {
    const conversation = this.getActiveConversation();
    if (!conversation) return;

    const message = conversation.messages.find(m => m.timestamp == messageTimestamp);
    if (!message || !message.jsonData) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data, targets) => {
          Object.keys(data).forEach(fieldName => {
            const target = targets.find(t => t.name === fieldName);
            if (target) {
              const element = document.querySelector(target.selector);
              if (element) {
                const value = typeof data[fieldName] === 'object' 
                  ? JSON.stringify(data[fieldName]) 
                  : data[fieldName];
                
                if (element.type === 'checkbox' || element.type === 'radio') {
                  element.checked = !!value;
                } else if (element.tagName === 'SELECT') {
                  element.value = value;
                } else {
                  element.value = value;
                }
                
                // Dispatch change event
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          });
        },
        args: [message.jsonData, message.targets || []]
      });

      this.updateStatus('Applied to page', 'active');
      setTimeout(() => this.updateStatus('Ready'), 2000);
    } catch (error) {
      console.error('Failed to apply to page:', error);
      this.updateStatus('Error applying changes', 'error');
    }
  }

  async previewChanges(messageTimestamp) {
    const conversation = this.getActiveConversation();
    if (!conversation) return;

    const message = conversation.messages.find(m => m.timestamp == messageTimestamp);
    if (!message || !message.jsonData) return;

    // Create a preview dialog
    const preview = Object.keys(message.jsonData).map(key => {
      const value = typeof message.jsonData[key] === 'object' 
        ? JSON.stringify(message.jsonData[key], null, 2)
        : message.jsonData[key];
      return `${key}: ${value}`;
    }).join('\n');

    alert(`Preview of changes:\n\n${preview}`);
  }

  updateStatus(text, type = '') {
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
      statusIndicator.textContent = text;
      statusIndicator.className = `status-indicator ${type}`;
    }
  }

  escapeHtml(text) {
    try {
      if (text === null || text === undefined) {
        return '';
      }
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    } catch (error) {
      console.error('Error escaping HTML:', error);
      return String(text || '');
    }
  }
}

// Initialize the conversation manager
let conversationManager;

function initializeApp() {
  conversationManager = new ConversationManager();
  // Make conversationManager globally available for onclick handlers
  window.conversationManager = conversationManager;
}

// Try multiple initialization methods
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already loaded
  initializeApp();
}

// Also try with window.onload as fallback
window.addEventListener('load', () => {
  if (!conversationManager) {
    initializeApp();
  }
});