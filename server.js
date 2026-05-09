const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;
const SECRET_KEY = process.env.JWT_SECRET || 'lokoforyou-super-secret-key';

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

global.db = db;
global.SECRET_KEY = SECRET_KEY;
global.bcrypt = bcrypt;
global.jwt = jwt;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

const { authenticateToken } = require('./middleware/auth');
global.authenticateToken = authenticateToken;

const routeApp = {
    get: (path, ...handlers) => app.get(path, ...handlers),
    post: (path, ...handlers) => app.post(path, ...handlers),
    put: (path, ...handlers) => app.put(path, ...handlers),
    delete: (path, ...handlers) => app.delete(path, ...handlers)
};
global.app = routeApp;

async function initDb() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, phone TEXT, "idNumber" TEXT, "monthlyContribution" DECIMAL, "monthlyTarget" DECIMAL DEFAULT 0, "yearlyTarget" DECIMAL DEFAULT 0, "createdAt" TEXT)`);
        await db.query(`CREATE TABLE IF NOT EXISTS stokvel_groups (id SERIAL PRIMARY KEY, name TEXT, description TEXT, "groupBalance" DECIMAL DEFAULT 0, "monthlyTarget" DECIMAL DEFAULT 0, "yearlyTarget" DECIMAL DEFAULT 0)`);
        await db.query(`CREATE TABLE IF NOT EXISTS group_members ("groupId" INTEGER, "userId" INTEGER, role TEXT DEFAULT 'Member', PRIMARY KEY("groupId", "userId"), FOREIGN KEY("groupId") REFERENCES stokvel_groups(id), FOREIGN KEY("userId") REFERENCES users(id))`);
        await db.query(`CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, "userId" INTEGER, "groupId" INTEGER, amount DECIMAL, method TEXT, date TEXT, status TEXT DEFAULT 'pending', reference TEXT, "proofPath" TEXT, FOREIGN KEY("userId") REFERENCES users(id), FOREIGN KEY("groupId") REFERENCES stokvel_groups(id))`);
        await db.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, "userId" INTEGER, title TEXT, message TEXT, type TEXT DEFAULT 'info', "isRead" INTEGER DEFAULT 0, "createdAt" TEXT, FOREIGN KEY("userId") REFERENCES users(id))`);
        console.log('Database initialized.');
    } catch (err) { console.error('DB Init Error:', err); }
}
initDb();

require('./routes/auth');
require('./routes/members');
require('./routes/payments');
require('./routes/notifications');
require('./routes/chat');
require('./routes/dashboard');

app.listen(PORT, () => { console.log('Backend running on port ' + PORT); });
