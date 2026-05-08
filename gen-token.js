const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'lokoforyou-super-secret-key';

const payload = { id: 1, name: 'TestAdmin' };
const token = jwt.sign(payload, SECRET_KEY);
console.log("Using Secret:", SECRET_KEY);
console.log(token);
