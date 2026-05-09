// Member Routes
app.get('/api/members/me', authenticateToken, async (req, res) => {
    try {
        const userRes = await db.query('SELECT u.*, gm."groupId", gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm."userId" WHERE u.id = $1', [req.user.id]);
        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ error: "User not found" });

        const payRes = await db.query('SELECT * FROM payments WHERE "userId" = $1', [req.user.id]);
        const userPayments = payRes.rows;
        const now = new Date();
        const curY = now.getFullYear(), curM = now.getMonth();

        const calcM = (pays) => (pays || []).filter(p => {
            const d = new Date(p.date);
            return p.status === 'verified' && d.getFullYear() === curY && d.getMonth() === curM;
        }).reduce((s, p) => s + Number(p.amount), 0);

        const stats = {
            totalVerified: userPayments.filter(p => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0),
            totalPending: userPayments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0),
            paymentsCount: userPayments.length,
            yearlyContributions: userPayments.filter(p => p.status === 'verified' && new Date(p.date).getFullYear() === curY).reduce((s, p) => s + Number(p.amount), 0),
            totalContributions: userPayments.filter(p => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0),
            monthlyVerified: calcM(userPayments)
        };

        const memberData = { id: user.id, fullName: user.name, email: user.email, phone: user.phone, idNumber: user.idNumber, monthlyContribution: user.monthlyContribution, monthlyTarget: user.monthlyTarget, yearlyTarget: user.yearlyTarget, groupId: user.groupId, role: user.role, createdAt: user.createdAt };

        if (user.groupId) {
            const groupRes = await db.query('SELECT * FROM stokvel_groups WHERE id = $1', [user.groupId]);
            const group = groupRes.rows[0];
            if (group) {
                const gpRes = await db.query('SELECT amount, date, status FROM payments WHERE "groupId" = $1', [user.groupId]);
                stats.group = group;
                stats.groupMonthlyVerified = calcM(gpRes.rows);
            }
        }
        res.json({ member: memberData, stats });
    } catch (err) { 
        console.error("Profile Fetch Error:", err);
        res.status(500).json({ error: "Profile fetch error" }); 
    }
});

app.put('/api/members/me', authenticateToken, async (req, res) => {
    const { fullName, phone, idNumber, monthlyContribution, monthlyTarget, yearlyTarget } = req.body;
    try {
        await db.query('UPDATE users SET name = $1, phone = $2, "idNumber" = $3, "monthlyContribution" = $4, "monthlyTarget" = $5, "yearlyTarget" = $6 WHERE id = $7', [fullName, phone, idNumber, monthlyContribution, monthlyTarget, yearlyTarget, req.user.id]);
        const userRes = await db.query('SELECT u.*, gm."groupId", gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm."userId" WHERE u.id = $1', [req.user.id]);
        const user = userRes.rows[0];
        res.json({ 
            member: { 
                id: user.id, 
                fullName: user.name, 
                email: user.email, 
                phone: user.phone, 
                idNumber: user.idNumber, 
                monthlyContribution: user.monthlyContribution, 
                monthlyTarget: user.monthlyTarget, 
                yearlyTarget: user.yearlyTarget, 
                groupId: user.groupId, 
                role: user.role, 
                createdAt: user.createdAt 
            } 
        });
    } catch (err) { 
        console.error("Update Member Error:", err);
        res.status(500).json({ error: "Update error" }); 
    }
});

// Group Management Routes
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, description FROM stokvel_groups ORDER BY name ASC');
        res.json({ groups: result.rows });
    } catch (err) {
        res.status(500).json({ error: "Error fetching groups" });
    }
});

app.post('/api/groups/create', authenticateToken, async (req, res) => {
    const { name, description, monthlyTarget, yearlyTarget } = req.body;
    try {
        // 1. Leave current group
        await db.query('DELETE FROM group_members WHERE "userId" = $1', [req.user.id]);
        
        // 2. Create new group
        const groupRes = await db.query(
            'INSERT INTO stokvel_groups (name, description, "monthlyTarget", "yearlyTarget") VALUES ($1, $2, $3, $4) RETURNING id',
            [name, description, monthlyTarget || 0, yearlyTarget || 0]
        );
        const groupId = groupRes.rows[0].id;

        // 3. Join as Admin
        await db.query(
            'INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3)',
            [groupId, req.user.id, 'Admin']
        );

        res.json({ success: true, groupId });
    } catch (err) {
        console.error("Create Group Error:", err);
        res.status(500).json({ error: "Error creating group" });
    }
});

app.post('/api/groups/join', authenticateToken, async (req, res) => {
    const { groupId } = req.body;
    try {
        // 1. Leave current group
        await db.query('DELETE FROM group_members WHERE "userId" = $1', [req.user.id]);
        
        // 2. Join new group
        await db.query(
            'INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3)',
            [groupId, req.user.id, 'Member']
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Join Group Error:", err);
        res.status(500).json({ error: "Error joining group" });
    }
});
