// Member Routes
app.get('/api/members/me', authenticateToken, (req, res) => {
    db.get('SELECT u.*, gm.groupId, gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm.userId WHERE u.id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        db.all('SELECT * FROM payments WHERE userId = ?', [req.user.id], (err, userPayments) => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-indexed

            const calculateMonthTotal = (payments) => (payments || [])
                .filter(p => {
                    const d = new Date(p.date);
                    return p.status === 'verified' && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
                })
                .reduce((s, p) => s + p.amount, 0);

            const stats = {
                totalVerified: (userPayments || []).filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0),
                totalPending: (userPayments || []).filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
                paymentsCount: (userPayments || []).length,
                yearlyContributions: (userPayments || []).filter(p => p.status === 'verified' && new Date(p.date).getFullYear() === currentYear).reduce((s, p) => s + p.amount, 0),
                totalContributions: (userPayments || []).filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0),
                monthlyVerified: calculateMonthTotal(userPayments)
            };

            const memberData = {
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
            };

            if (user.groupId) {
                db.get('SELECT * FROM stokvel_groups WHERE id = ?', [user.groupId], (err, group) => {
                    if (err || !group) return res.json({ member: memberData, stats });
                    
                    // Get ALL verified payments for the group this month
                    db.all('SELECT amount, date, status FROM payments WHERE groupId = ?', [user.groupId], (err, groupPayments) => {
                        stats.group = group;
                        stats.groupMonthlyVerified = calculateMonthTotal(groupPayments);
                        res.json({ member: memberData, stats });
                    });
                });
            } else {
                res.json({ member: memberData, stats });
            }
        });
    });
});

app.put('/api/members/me', authenticateToken, (req, res) => {
    const { fullName, phone, idNumber, monthlyContribution, monthlyTarget, yearlyTarget } = req.body;

    db.run('UPDATE users SET name = ?, phone = ?, idNumber = ?, monthlyContribution = ?, monthlyTarget = ?, yearlyTarget = ? WHERE id = ?',
        [fullName, phone, idNumber, monthlyContribution, monthlyTarget, yearlyTarget, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT u.*, gm.groupId, gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm.userId WHERE u.id = ?', [req.user.id], (err, user) => {
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
        });
    });
});
