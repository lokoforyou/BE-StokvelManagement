require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function promote(email) {
    console.log(`Promoting ${email} to Super Admin...`);
    try {
        const res = await db.query(
            'UPDATE users SET "isSuperAdmin" = 1 WHERE email = $1 RETURNING name',
            [email]
        );
        
        if (res.rows.length > 0) {
            console.log(`SUCCESS: ${res.rows[0].name} is now a Super Admin!`);
        } else {
            console.error(`ERROR: User with email ${email} not found.`);
        }
    } catch (err) {
        console.error('Promotion Error:', err);
    } finally {
        await db.end();
    }
}

const targetEmail = process.argv[2] || 'admin@example.com';
promote(targetEmail);
