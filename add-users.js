require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function addUsers() {
    console.log('Adding specific test users...');
    try {
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const date = new Date().toISOString();

        // 1. Ensure 'test group' exists
        const groupName = 'test group';
        let groupRes = await db.query('SELECT id FROM stokvel_groups WHERE name = $1', [groupName]);
        let groupId;
        
        if (groupRes.rows.length === 0) {
            console.log(`Creating group: ${groupName}`);
            const newGroup = await db.query(
                'INSERT INTO stokvel_groups (name, description) VALUES ($1, $2) RETURNING id',
                [groupName, 'Test environment group']
            );
            groupId = newGroup.rows[0].id;
        } else {
            groupId = groupRes.rows[0].id;
        }

        const usersToAdd = [
            { name: 'adminmusa', email: 'adminmusa@test.com', role: 'Admin' },
            { name: 'testmusa', email: 'testmusa@test.com', role: 'Member' }
        ];

        for (const u of usersToAdd) {
            console.log(`Processing user: ${u.name}`);
            const userRes = await db.query(
                'INSERT INTO users (name, email, password, "monthlyContribution", "createdAt") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                [u.name, u.email, hashedPassword, 500, date]
            );
            const userId = userRes.rows[0].id;

            // Link to group
            await db.query(
                'INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3) ON CONFLICT ("groupId", "userId") DO UPDATE SET role = EXCLUDED.role',
                [groupId, userId, u.role]
            );
            console.log(`User ${u.name} (${u.email}) is ready.`);
        }

        console.log('All users created/updated successfully!');

    } catch (err) {
        console.error('Error adding users:', err);
    } finally {
        await db.end();
    }
}

addUsers();
