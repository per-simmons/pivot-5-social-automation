// Simple HTTP server for test frontend
// Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Serve the test frontend
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'test-frontend.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Pivot 5 Test Frontend Server`);
  console.log(`=====================================`);
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Open http://localhost:${PORT} in your browser`);
  console.log(`   2. Set up N8N webhook workflow (see n8n-workflow.json)`);
  console.log(`   3. Enter your N8N webhook URL in the frontend`);
  console.log(`   4. Click the test button!`);
  console.log(`\n🛑 Press Ctrl+C to stop the server\n`);
});
