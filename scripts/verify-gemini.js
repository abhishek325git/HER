const https = require('https');

const API_KEY = 'AIzaSyCZJ5fD157H3qksYWVTnZKlEs9F5Y7nG8E';
const MODEL = 'gemini-1.5-flash-001';

const data = JSON.stringify({
  contents: [{
    parts: [{ text: "Hello, can you hear me?" }]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log(`Testing API Key: ${API_KEY.substring(0, 10)}...`);
console.log(`URL: https://${options.hostname}${options.path.replace(API_KEY, 'HIDDEN')}`);

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    console.log(responseBody);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
