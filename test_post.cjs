const http = require('http');

const data = JSON.stringify({
  appId: "APP_7E29B5",
  username: "test_node_user",
  password: "password123"
});

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/dashboard/users',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer o08jDiopRZWaPffBCQGFCHFyhH83',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseBody = '';
  res.on('data', d => {
    responseBody += d;
  });
  res.on('end', () => {
    console.log("Response:", responseBody);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
