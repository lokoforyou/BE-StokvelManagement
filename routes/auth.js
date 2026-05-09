// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    const { fullName, email, password, phone, monthlyContribution, groupName } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const date = new Date().toISOString();
        const userRes = await db.query('INSERT INTO users (name, email, password, phone, "monthlyContribution", "createdAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [fullName, email, hashedPassword, phone, monthlyContribution || 0, date]);
        const userId = userRes.rows[0].id;
        if (groupName) {
            const groupRes = await db.query('SELECT id FROM stokvel_groups WHERE name = $1', [groupName]);
            const group = groupRes.rows[0];
            if (group) { await joinGroup(group.id, userId, 'Member', res, { id: userId, fullName, email, createdAt: date }); }
            else {
                const newGroupRes = await db.query('INSERT INTO stokvel_groups (name, description) VALUES ($1, $2) RETURNING id', [groupName, "Stokvel Group"]);
                await joinGroup(newGroupRes.rows[0].id, userId, 'Admin', res, { id: userId, fullName, email, createdAt: date });
            }
        } else {
            const token = jwt.sign({ id: userId }, SECRET_KEY);
            res.json({ token, member: { id: userId, fullName, email, createdAt: date } });
        }
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Email already exists" });
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Signup error", details: err.message });
    }
});

async function joinGroup(groupId, userId, role, res, memberData) {
    try {
        await db.query('INSERT INTO group_members ("groupId", "userId", role) VALUES ($1, $2, $3)', [groupId, userId, role]);
        const token = jwt.sign({ id: userId }, SECRET_KEY);
        res.json({ token, member: { ...memberData, groupId, role } });
    } catch (err) {
        console.error("Join Group Error:", err);
        res.status(500).json({ error: "Error joining group" });
    }
}

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT u.*, gm."groupId", gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm."userId" WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Invalid credentials" });
        const token = jwt.sign({ id: user.id }, SECRET_KEY);
        res.json({ 
            token, 
            member: { 
                id: user.id, 
                fullName: user.name, 
                email: user.email, 
                phone: user.phone, 
                idNumber: user.idNumber, 
                monthlyContribution: user.monthlyContribution, 
                groupId: user.groupId, 
                role: user.role, 
                createdAt: user.createdAt 
            } 
        });
    } catch (err) { 
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login error", details: err.message }); 
    }
});
