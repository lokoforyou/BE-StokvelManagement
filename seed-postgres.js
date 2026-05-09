require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function seed() {
    console.log('Starting seed process...');
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const date = new Date().toISOString();

        // 1. Create Tables (just in case)
        console.log('Ensuring tables exist...');
        await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, phone TEXT, "idNumber" TEXT, "monthlyContribution" DECIMAL, "monthlyTarget" DECIMAL DEFAULT 0, "yearlyTarget" DECIMAL DEFAULT 0, "createdAt" TEXT)`);
        await db.query(`CREATE TABLE IF NOT EXISTS stokvel_groups (id SERIAL PRIMARY KEY, name TEXT, description TEXT, "groupBalance" DECIMAL DEFAULT 0, "monthlyTarget" DECIMAL DEFAULT 0, "yearlyTarget" DECIMAL DEFAULT 0)`);
        await db.query(`CREATE TABLE IF NOT EXISTS group_members ("groupId" INTEGER, "userId" INTEGER, role TEXT DEFAULT 'Member', PRIMARY KEY("groupId", "userId"), FOREIGN KEY("groupId") REFERENCES stokvel_groups(id), FOREIGN KEY("userId") REFERENCES users(id))`);
        await db.query(`CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, "userId" INTEGER, "groupId" INTEGER, amount DECIMAL, method TEXT, date TEXT, status TEXT DEFAULT 'pending', reference TEXT, "proofPath" TEXT, FOREIGN KEY("userId") REFERENCES users(id), FOREIGN KEY("groupId") REFERENCES stokvel_groups(id))`);
        
        // 2. Clear Existing Data (Optional - be careful in production!)
        // console.log('Clearing old data...');
        // await db.query('TRUNCATE users, stokvel_groups, group_members, payments RESTART IDENTITY CASCADE');

        // 3. Insert Admin User
        console.log('Inserting test user...');
        const userRes = await db.query(
            'INSERT INTO users (name, email, password, phone, "monthlyContribution", "createdAt") VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING RETURNING id',
            ['Test Admin', 'admin@example.com', hashedPassword, '0812345678', 500, date]
        );
        
        if (userRes.rows.length === 0) {
            console.log('User already exists, skipping user creation.');
            return;
        }
        
        const userId = userRes.rows[0].id;

        // 4. Insert Group
        console.log('Inserting test group...');
        const groupRes = await db.query(
            'INSERT INTO stokvel_groups (name, description, "groupBalance", "monthlyTarget", "yearlyTarget") VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['Alpha Stokvel', 'Our primary testing group', 1000, 5000, 60000]
        );
        const groupId = groupRes.rows[0].id;

        // 5. Link User to Group as Admin
        await db.query(
            'INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3)',
            [groupId, userId, 'Admin']
        );

        // 6. Insert a Payment
        await db.query(
            'INSERT INTO payments ("userId", "groupId", amount, method, date, reference, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, groupId, 500, 'EFT', date, 'SEED-PAY-001', 'verified']
        );

        console.log('Seeding complete! You can now log in with:');
        console.log('Email: admin@example.com');
        console.log('Password: password123');

    } catch (err) {
        console.error('Seeding Error:', err);
    } finally {
        await db.end();
    }
}

seed();
