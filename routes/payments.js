const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Payment Routes
app.get('/api/payments', authenticateToken, async (req, res) => {
    try {
        const gmRes = await db.query('SELECT role, "groupId" FROM group_members WHERE "userId" = $1', [req.user.id]);
        const gm = gmRes.rows[0];
        if (!gm) return res.json({ payments: [] });

        let sql = 'SELECT p.*, u.name as "userName" FROM payments p JOIN users u ON p."userId" = u.id WHERE p."groupId" = $1';
        let params = [gm.groupId];
        if (gm.role !== 'Admin') {
            sql += ' AND p."userId" = $2';
            params.push(req.user.id);
        }
        const payRes = await db.query(sql, params);
        res.json({ payments: payRes.rows.map(r => ({ ...r, paidAt: r.date })) });
    } catch (err) { 
        console.error("Payments Fetch Error:", err);
        res.status(500).json({ error: "Payments fetch error" }); 
    }
});

app.post('/api/payments', authenticateToken, upload.single('proof'), async (req, res) => {
    const { amount, reference, method, groupId } = req.body;
    const date = new Date().toISOString(), proofPath = req.file ? req.file.path : null;
    if ((method === 'Cash' || method === 'Direct Pay') && !proofPath) return res.status(400).json({ error: "Proof required" });
    try {
        const payRes = await db.query('INSERT INTO payments ("userId", "groupId", amount, method, date, reference, status, "proofPath") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [req.user.id, groupId || null, amount, method, date, reference, 'pending', proofPath]);
        const payId = payRes.rows[0].id;
        if (groupId) {
            const adminRes = await db.query('SELECT "userId" FROM group_members WHERE "groupId" = $1 AND role = \'Admin\'', [groupId]);
            if (adminRes.rows[0]) {
                const msg = `New ${method} payment of R${amount} from ${req.user.id} needs verification.`;
                await db.query('INSERT INTO notifications ("userId", title, message, type, "isRead", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)', [adminRes.rows[0].userId, 'Payment Alert', msg, 'warning', 0, date]);
            }
        }
        res.json({ id: payId, status: 'pending' });
    } catch (err) { 
        console.error("Payment Creation Error:", err);
        res.status(500).json({ error: "Payment creation error" }); 
    }
});

app.post('/api/payments/:id/verify', authenticateToken, async (req, res) => {
    try {
        const rowRes = await db.query('SELECT gm.role, p."groupId", p.amount FROM group_members gm JOIN payments p ON gm."groupId" = p."groupId" WHERE gm."userId" = $1 AND p.id = $2', [req.user.id, req.params.id]);
        const row = rowRes.rows[0];
        if (!row || row.role !== 'Admin') return res.status(403).json({ error: "Unauthorized" });
        await db.query('UPDATE payments SET status = \'verified\' WHERE id = $1', [req.params.id]);
        await db.query('UPDATE stokvel_groups SET "groupBalance" = "groupBalance" + $1 WHERE id = $2', [row.amount, row.groupId]);
        res.json({ success: true });
    } catch (err) { 
        console.error("Verification Error:", err);
        res.status(500).json({ error: "Verification error" }); 
    }
});
