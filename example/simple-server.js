const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }
  
  // Handle root path - show index page
  if (parsedUrl.pathname === '/') {
    serveIndexPage(res);
    return;
  }
  
  // Handle API requests
  if (req.method === 'POST' && parsedUrl.pathname === '/api/ai') {
    handleAiRequest(req, res);
    return;
  }
  
  // Serve static files
  const filePath = path.join(__dirname, parsedUrl.pathname);
  
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = getContentType(ext);
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'X-AI-Assist': 'on',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      
      const fileContent = fs.readFileSync(filePath);
      res.end(fileContent);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error: ' + error.message);
  }
});

function serveIndexPage(res) {
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Assistant Test Server</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      background: #f8f9fa;
    }
    .header {
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .test-pages {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .page-card {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 25px;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .page-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      text-decoration: none;
    }
    .page-card h3 {
      color: #007bff;
      margin-top: 0;
    }
    .instructions {
      background: white;
      border: 1px solid #28a745;
      border-left: 4px solid #28a745;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .features {
      background: #e3f2fd;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 AI Assistant Test Server</h1>
    <p>Test the AI Field Assistant Chrome Extension with different page contexts</p>
  </div>

  <div class="instructions">
    <h2>🚀 How to Test</h2>
    <ol>
      <li><strong>Install the Chrome Extension</strong> - Load the AI Field Assistant extension in Chrome</li>
      <li><strong>Configure AI Endpoint</strong> - Set up your AI endpoint in extension settings (or use mock mode)</li>
      <li><strong>Visit Test Pages</strong> - Click on any test page below to begin testing</li>
      <li><strong>Open Sidebar</strong> - Click the extension icon to open the AI Assistant sidebar</li>
      <li><strong>Test Conversations</strong> - Each page should have independent conversations and context</li>
    </ol>
  </div>

  <div class="features">
    <h3>✨ What to Test</h3>
    <ul>
      <li><strong>Context Awareness</strong> - AI should understand each page's specific content</li>
      <li><strong>Conversation Isolation</strong> - Each page should have separate conversation history</li>
      <li><strong>Form Filling</strong> - AI can fill forms based on page context</li>
      <li><strong>Multi-turn Dialogue</strong> - Have conversations before applying results</li>
    </ul>
  </div>

  <h2>🧪 Test Pages</h2>
  <div class="test-pages">
    <a href="/test-form.html" class="page-card">
      <h3>📋 Original Form Test</h3>
      <p><strong>Context:</strong> Customer service form</p>
      <p>Test basic form filling functionality with customer information context.</p>
      <p><em>Good for: Basic testing, form auto-fill</em></p>
    </a>

    <a href="/ecommerce.html" class="page-card">
      <h3>🛒 E-commerce Page</h3>
      <p><strong>Context:</strong> TechStore laptop shopping</p>
      <p>Simulate a customer browsing products with purchase intent and shopping cart data.</p>
      <p><em>Good for: Sales context, product information</em></p>
    </a>

    <a href="/blog.html" class="page-card">
      <h3>📝 Tech Blog</h3>
      <p><strong>Context:</strong> AI development article</p>
      <p>Test with blog content, author information, and reader engagement data.</p>
      <p><em>Good for: Content context, comment generation</em></p>
    </a>

    <a href="/corporate.html" class="page-card">
      <h3>🏢 Corporate Site</h3>
      <p><strong>Context:</strong> CloudScale consulting</p>
      <p>Business-to-business context with enterprise services and lead generation.</p>
      <p><em>Good for: Professional context, B2B communication</em></p>
    </a>
  </div>

  <div class="instructions">
    <h3>🔍 Testing Checklist</h3>
    <ul>
      <li>✅ Each page shows different conversation history</li>
      <li>✅ AI responses reflect page-specific context</li>
      <li>✅ Form fields get filled with relevant information</li>
      <li>✅ Multiple rounds of conversation work smoothly</li>
      <li>✅ "Apply to Page" button works correctly</li>
      <li>✅ JSON preview shows expected data structure</li>
    </ul>
  </div>
</body>
</html>
  `;
  
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'X-AI-Assist': 'on',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  res.end(indexHtml);
}

function handleAiRequest(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const response = generateAiResponse(data);
      
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

function generateAiResponse(requestData) {
  console.log('AI Request received:', {
    model: requestData.model || 'default',
    temperature: requestData.temperature || 'default',
    top_p: requestData.top_p || 'default',
    messages: requestData.messages?.length || 0,
    content_preview: requestData.messages?.[0]?.content?.substring(0, 50) + (requestData.messages?.[0]?.content?.length > 50 ? '...' : '')
  });
  
  const userMessage = requestData.messages?.[0]?.content || '';
  let responseContent = '';
  
  if (userMessage.includes('connection test')) {
    // Special response for connection test
    responseContent = '{"testField": "Connection successful"}';
  } else if (userMessage.includes('customerName') || userMessage.includes('email') || userMessage.includes('productType')) {
    // Normal form filling response
    responseContent = JSON.stringify({
      customerName: 'John Smith',
      email: 'john.smith@example.com',
      productType: 'Enterprise Cloud Solutions',
      message: 'Hello, I am interested in learning more about your Enterprise Cloud Solutions package. As discussed, we need a scalable solution for our growing development team. Could you please provide more details about pricing and implementation timeline?'
    });
  } else {
    // Generic response
    responseContent = '{"response": "This is a test response from the AI endpoint"}';
  }
  
  const response = {
    id: 'chatcmpl-' + Math.random().toString(36).substring(2, 15),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: requestData.model || 'openai/gpt-3.5-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: responseContent
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70
    }
  };
  
  console.log('AI Response generated:', {
    model: response.model,
    content: responseContent,
    usage: response.usage
  });
  
  return response;
}

function getContentType(ext) {
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'text/plain';
}

server.listen(port, () => {
  console.log(`🚀 AI Assistant Test Server running at http://localhost:${port}`);
  console.log('');
  console.log('📋 Available test pages:');
  console.log(`   📝 Index page: http://localhost:${port}/`);
  console.log(`   📋 Original form: http://localhost:${port}/test-form.html`);
  console.log(`   🛒 E-commerce: http://localhost:${port}/ecommerce.html`);
  console.log(`   📖 Blog post: http://localhost:${port}/blog.html`);
  console.log(`   🏢 Corporate: http://localhost:${port}/corporate.html`);
  console.log('');
  console.log(`🤖 AI API endpoint: http://localhost:${port}/api/ai`);
  console.log('');
  console.log('✨ Each page has unique context and should maintain separate conversations!');
});