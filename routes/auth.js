// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    const { fullName, email, password, phone, monthlyContribution, groupName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const date = new Date().toISOString();
    
    db.serialize(() => {
        db.run('INSERT INTO users (name, email, password, phone, monthlyContribution, createdAt) VALUES (?, ?, ?, ?, ?, ?)', 
            [fullName, email, hashedPassword, phone, monthlyContribution, date], function(err) {
            if (err) return res.status(400).json({ error: "Email already exists" });
            const userId = this.lastID;
            
            if (groupName) {
                db.get('SELECT id FROM stokvel_groups WHERE name = ?', [groupName], (err, group) => {
                    if (group) {
                        joinGroup(group.id, userId, 'Member', res, { id: userId, fullName, email, createdAt: date });
                    } else {
                        db.run('INSERT INTO stokvel_groups (name, description) VALUES (?, ?)', [groupName, "Stokvel Group"], function() {
                            joinGroup(this.lastID, userId, 'Admin', res, { id: userId, fullName, email, createdAt: date });
                        });
                    }
                });
            } else {
                const token = jwt.sign({ id: userId }, SECRET_KEY);
                res.json({ token, member: { id: userId, fullName, email, createdAt: date } });
            }
        });
    });
});

function joinGroup(groupId, userId, role, res, memberData) {
    db.run('INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, ?)', [groupId, userId, role], () => {
        const token = jwt.sign({ id: userId }, SECRET_KEY);
        res.json({ token, member: { ...memberData, groupId, role } });
    });
}

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT u.*, gm.groupId, gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm.userId WHERE email = ?', [email], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
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
    });
});
