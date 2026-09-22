const fs = require('fs');

async function runTest() {
  try {
    fs.writeFileSync('dummy.jpg', 'dummy content');
    
    // We need to build a multipart/form-data body manually for fetch since FormData in Node fetch doesn't natively read from fs directly without some work in older versions, but Node 22 has good support.
    // Using global FormData in Node 22
    const formData = new FormData();
    formData.append('conversationId', '123456789012345678901234'); // dummy hex string
    
    const blob = new Blob([fs.readFileSync('dummy.jpg')], { type: 'image/jpeg' });
    formData.append('files', blob, 'dummy.jpg');

    const response = await fetch('http://localhost:5000/api/messages', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });

    const data = await response.json().catch(() => null);
    console.log('STATUS:', response.status);
    console.log('RESPONSE:', data);
    
    fs.unlinkSync('dummy.jpg');
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}

runTest();
