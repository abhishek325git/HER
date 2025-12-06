const https = require('https');

const API_KEY = 'AIzaSyCZJ5fD157H3qksYWVTnZKlEs9F5Y7nG8E';

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${API_KEY}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`Checking available models for key ending in ...${API_KEY.slice(-6)}`);

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
        const parsed = JSON.parse(responseBody);
        if (parsed.models) {
            console.log("AVAILABLE GEMINI MODELS:");
            const geminiModels = parsed.models.filter(m => m.name.toLowerCase().includes('gemini'));
            if (geminiModels.length > 0) {
                geminiModels.forEach(m => console.log(m.name));
            } else {
                console.log("No Gemini models found! (Only found: " + parsed.models.map(m => m.name).slice(0, 3).join(', ') + "...)");
            }
        } else {
            console.log("No 'models' field in response:", JSON.stringify(parsed, null, 2));
        }
    } catch (e) {
        console.log(responseBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
