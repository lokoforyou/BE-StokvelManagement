const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IlRlc3RBZG1pbiIsImlhdCI6MTc3ODI1MzkzOH0.0zU-XnADa8z2Lnbvb93IqaL-r2fLLcob82Dq_JoU2tI";
const postData = JSON.stringify({ message: "test" });

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        console.log("Body:", data);
    });
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
