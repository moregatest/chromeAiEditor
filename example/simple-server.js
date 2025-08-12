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
  
  if (parsedUrl.pathname === '/') {
    parsedUrl.pathname = '/test-form.html';
  }
  
  const filePath = path.join(__dirname, parsedUrl.pathname);
  
  if (req.method === 'POST' && parsedUrl.pathname === '/api/ai') {
    handleAiRequest(req, res);
    return;
  }
  
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
  console.log(`Test server running at http://localhost:${port}`);
  console.log('The server will serve test-form.html with the required X-AI-Assist header');
  console.log('AI API endpoint available at http://localhost:3000/api/ai');
});