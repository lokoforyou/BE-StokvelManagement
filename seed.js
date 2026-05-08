const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'db/database.sqlite');
const db = new sqlite3.Database(dbPath);

async function seed() {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    
    console.log("--- Initializing TestGroup Seed ---");

    db.serialize(() => {
        // 1. Clean Database
        db.run('DELETE FROM notifications');
        db.run('DELETE FROM payments');
        db.run('DELETE FROM group_members');
        db.run('DELETE FROM stokvel_groups');
        db.run('DELETE FROM users');

        // 2. Create TestGroup
        // Targets: Monthly R10k (10 members * R1k), Yearly R120k
        db.run(`INSERT INTO stokvel_groups (id, name, description, groupBalance, monthlyTarget, yearlyTarget) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [1, 'TestGroup', 'Official Testing Group', 0, 10000, 120000]);

        // 3. Create 10 Members
        const memberConfigs = [
            { id: 1, name: 'TestAdmin', email: 'testadmin@test.com', role: 'Admin', contrib: 1000 },
            { id: 2, name: 'MusaAdmin', email: 'musaadmin@test.com', role: 'Admin', contrib: 1000 },
            { id: 3, name: 'MusaTest', email: 'musatest@test.com', role: 'Member', contrib: 1000 },
            { id: 4, name: 'John Test', email: 'john@test.com', role: 'Member', contrib: 1000 },
            { id: 5, name: 'Sarah Test', email: 'sarah@test.com', role: 'Member', contrib: 1000 },
            { id: 6, name: 'David Test', email: 'david@test.com', role: 'Member', contrib: 1000 },
            { id: 7, name: 'Emma Test', email: 'emma@test.com', role: 'Member', contrib: 1000 },
            { id: 8, name: 'Peter Test', email: 'peter@test.com', role: 'Member', contrib: 1000 },
            { id: 9, name: 'Linda Test', email: 'linda@test.com', role: 'Member', contrib: 1000 },
            { id: 10, name: 'Banele Test', email: 'banele@test.com', role: 'Member', contrib: 1000 },
        ];

        memberConfigs.forEach(m => {
            const joinDate = '2025-01-01T08:00:00.000Z';
            db.run(`INSERT INTO users (id, name, email, password, phone, monthlyContribution, monthlyTarget, yearlyTarget, createdAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [m.id, m.name, m.email, hashedPassword, '0123456789', m.contrib, m.contrib, m.contrib * 12, joinDate]);
            
            db.run(`INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, ?)`, [1, m.id, m.role]);
        });

        // 4. Generate Payments (Jan 2025 to May 2026)
        console.log("Generating payment history...");
        let groupTotalVerified = 0;
        const startDate = new Date(2025, 0, 1); // Jan 1, 2025
        const endDate = new Date(); // Today

        for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
            const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
            
            memberConfigs.forEach(m => {
                const isCurrentMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                const status = isCurrentMonth ? 'pending' : 'verified';
                const amount = m.contrib;
                const payDate = d.toISOString();
                const ref = `Contrib-${monthStr}`;

                db.run(`INSERT INTO payments (userId, groupId, amount, method, date, status, reference) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [m.id, 1, amount, 'EFT', payDate, status, ref]);
                
                if (status === 'verified') {
                    groupTotalVerified += amount;
                }
            });
        }

        // 5. Update Group Balance based on verified payments
        db.run(`UPDATE stokvel_groups SET groupBalance = ? WHERE id = 1`, [groupTotalVerified]);

        // 6. Create initial notifications for Admins
        db.run(`INSERT INTO notifications (userId, title, message, type, isRead, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [1, 'Welcome', 'TestGroup environment is ready for testing.', 'success', 0, now.toISOString()]);
        db.run(`INSERT INTO notifications (userId, title, message, type, isRead, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [2, 'Welcome', 'TestGroup environment is ready for testing.', 'success', 0, now.toISOString()]);
    });

    setTimeout(() => {
        db.close();
        console.log("--- Seeding Complete: TestGroup Loaded ---");
        console.log("Logins (Password: password123):");
        console.log("- testadmin@test.com (Admin)");
        console.log("- musaadmin@test.com (Admin)");
        console.log("- musatest@test.com (Member)");
    }, 2000);
}

seed();
