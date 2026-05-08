const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'lokoforyou-super-secret-key';

// Make globals for legacy route files
global.db = null;
global.SECRET_KEY = SECRET_KEY;
global.bcrypt = bcrypt;
global.jwt = jwt;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'db/database.sqlite'), (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});
global.db = db;

// Import Middleware
const { authenticateToken } = require('./middleware/auth');
global.authenticateToken = authenticateToken;

// Mock app for routes
const routeApp = {
    get: (path, ...handlers) => app.get(path, ...handlers),
    post: (path, ...handlers) => app.post(path, ...handlers),
    put: (path, ...handlers) => app.put(path, ...handlers),
    delete: (path, ...handlers) => app.delete(path, ...handlers)
};
global.app = routeApp;

// Create tables with Group support
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, phone TEXT, idNumber TEXT, monthlyContribution REAL, monthlyTarget REAL DEFAULT 0, yearlyTarget REAL DEFAULT 0, createdAt TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS stokvel_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, groupBalance REAL DEFAULT 0, monthlyTarget REAL DEFAULT 0, yearlyTarget REAL DEFAULT 0)");
    db.run("CREATE TABLE IF NOT EXISTS group_members (groupId INTEGER, userId INTEGER, role TEXT DEFAULT 'Member', PRIMARY KEY(groupId, userId), FOREIGN KEY(groupId) REFERENCES stokvel_groups(id), FOREIGN KEY(userId) REFERENCES users(id))");
    db.run("CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, groupId INTEGER, amount REAL, method TEXT, date TEXT, status TEXT DEFAULT 'pending', reference TEXT, proofPath TEXT, FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(groupId) REFERENCES stokvel_groups(id))");
    db.run("CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, title TEXT, message TEXT, type TEXT DEFAULT 'info', isRead INTEGER DEFAULT 0, createdAt TEXT, FOREIGN KEY(userId) REFERENCES users(id))");
});

// Load routes
console.log("Loading routes...");
require('./routes/auth');
require('./routes/members');
require('./routes/payments');
require('./routes/notifications');
require('./routes/chat');
console.log("Routes loaded.");

app.listen(PORT, () => {
    console.log('Backend running on http://localhost:' + PORT);
});
