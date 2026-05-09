require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function bulkSeed() {
    console.log('Starting bulk seed process...');
    try {
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 1. Create/Ensure Groups
        const groups = [
            { name: 'Group A', id: null },
            { name: 'Group B', id: null }
        ];

        for (let g of groups) {
            const res = await db.query(
                'INSERT INTO stokvel_groups (name, description, "monthlyTarget", "yearlyTarget") VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                [g.name, `Test ${g.name}`, 5000, 60000]
            );
            g.id = res.rows[0].id;
        }

        // 2. Generate Users
        const months = ["01", "02", "03", "04", "05"]; // Jan to May 2025
        
        for (let i = 0; i < 10; i++) {
            // Group A Users
            await createUserWithHistory(`testa${i}`, `testa${i}@test.com`, groups[0].id, hashedPassword, months);
            // Group B Users
            await createUserWithHistory(`testb${i}`, `testb${i}@test.com`, groups[1].id, hashedPassword, months);
        }

        console.log('Bulk seeding complete!');

    } catch (err) {
        console.error('Bulk Seeding Error:', err);
    } finally {
        await db.end();
    }
}

async function createUserWithHistory(name, email, groupId, hashedPassword, months) {
    console.log(`Creating user: ${name}`);
    const userRes = await db.query(
        'INSERT INTO users (name, email, password, "monthlyContribution", "createdAt") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [name, email, hashedPassword, 500, '2025-01-01T00:00:00.000Z']
    );
    const userId = userRes.rows[0].id;

    await db.query(
        'INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3) ON CONFLICT ("groupId", "userId") DO NOTHING',
        [groupId, userId, 'Member']
    );

    // Add payments for each month
    for (const m of months) {
        const amount = 500 + (Math.floor(Math.random() * 100)); // Randomize slightly for "exceeded" testing
        await db.query(
            'INSERT INTO payments ("userId", "groupId", amount, method, date, reference, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, groupId, amount, 'EFT', `2025-${m}-05T10:00:00.000Z`, `REF-${name}-${m}`, 'verified']
        );
    }
}

bulkSeed();
