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
            let res = await db.query('SELECT id FROM stokvel_groups WHERE name = $1', [g.name]);
            if (res.rows.length > 0) {
                g.id = res.rows[0].id;
            } else {
                res = await db.query(
                    'INSERT INTO stokvel_groups (name, description, "monthlyTarget", "yearlyTarget") VALUES ($1, $2, $3, $4) RETURNING id',
                    [g.name, `Test ${g.name}`, 5000, 60000]
                );
                g.id = res.rows[0].id;
            }
        }

        // 2. Generate time range
        const dates = [];
        // 2025: Months 0 to 11
        for (let m = 0; m < 12; m++) dates.push({ year: 2025, month: String(m + 1).padStart(2, '0') });
        // 2026: Months 0 to 4 (May is index 4)
        for (let m = 0; m < 5; m++) dates.push({ year: 2026, month: String(m + 1).padStart(2, '0') });

        // 3. Specifically set admin@example.com as Admin of Group A
        console.log('Setting up admin@example.com in Group A...');
        await createUserWithHistory('Main Admin', 'admin@example.com', groups[0].id, hashedPassword, dates, 'Admin');

        // 4. Generate other users
        for (let i = 0; i < 10; i++) {
            // Group A Users
            await createUserWithHistory(`testa${i}`, `testa${i}@test.com`, groups[0].id, hashedPassword, dates, 'Member');
            // Group B Users (only Jan-May 2025 history to differentiate)
            const shortDates = dates.slice(0, 5);
            await createUserWithHistory(`testb${i}`, `testb${i}@test.com`, groups[1].id, hashedPassword, shortDates, 'Member');
        }

        console.log('Bulk seeding complete!');

    } catch (err) {
        console.error('Bulk Seeding Error:', err);
    } finally {
        await db.end();
    }
}

async function createUserWithHistory(name, email, groupId, hashedPassword, dates, role) {
    console.log(`Processing user: ${name} (${email})`);
    
    // Upsert User
    const userRes = await db.query(
        'INSERT INTO users (name, email, password, "monthlyContribution", "createdAt") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [name, email, hashedPassword, 500, '2025-01-01T00:00:00.000Z']
    );
    const userId = userRes.rows[0].id;

    // Join Group (upsert)
    await db.query(
        'INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3) ON CONFLICT ("groupId", "userId") DO UPDATE SET role = EXCLUDED.role',
        [groupId, userId, role]
    );

    // Add payments for the date range
    for (const d of dates) {
        const amount = 500 + (Math.floor(Math.random() * 100));
        const paymentDate = `${d.year}-${d.month}-05T10:00:00.000Z`;
        
        // Skip if payment already exists for this user/month/year combination (simple check)
        const check = await db.query(
            'SELECT id FROM payments WHERE "userId" = $1 AND date LIKE $2',
            [userId, `${d.year}-${d.month}%`]
        );
        
        if (check.rows.length === 0) {
            await db.query(
                'INSERT INTO payments ("userId", "groupId", amount, method, date, reference, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, groupId, amount, 'EFT', paymentDate, `REF-${email}-${d.year}-${d.month}`, 'verified']
            );
        }
    }
}

bulkSeed();
