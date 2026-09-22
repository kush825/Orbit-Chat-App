const http = require('http');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const formData = new FormData();
    formData.append('conversationId', 'dummy');
    formData.append('text', 'Test message');
    
    fs.writeFileSync('test_file.txt', 'Hello world');
    formData.append('files', fs.createReadStream('test_file.txt'));

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/messages',
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer invalid_token'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
        fs.unlinkSync('test_file.txt');
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      fs.unlinkSync('test_file.txt');
    });

    formData.pipe(req);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testUpload();
