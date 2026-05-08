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
app.get('/api/payments', authenticateToken, (req, res) => {
    // Join with users to get the name of the person who paid
    db.get('SELECT role, groupId FROM group_members WHERE userId = ?', [req.user.id], (err, gm) => {
        if (!gm) return res.json({ payments: [] });

        let sql = 'SELECT p.*, u.name as userName FROM payments p JOIN users u ON p.userId = u.id WHERE p.groupId = ?';
        let params = [gm.groupId];

        if (gm.role !== 'Admin') {
            sql += ' AND p.userId = ?';
            params.push(req.user.id);
        }

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ payments: (rows || []).map(r => ({ ...r, paidAt: r.date })) });
        });
    });
});

app.post('/api/payments', authenticateToken, upload.single('proof'), (req, res) => {
    const { amount, reference, method, groupId } = req.body;
    const date = new Date().toISOString();
    const proofPath = req.file ? req.file.path : null;

    if ((method === 'Cash' || method === 'Direct Pay') && !proofPath) {
        return res.status(400).json({ error: "Proof of payment is required for Cash/Direct Pay." });
    }

    db.serialize(() => {
        db.run('INSERT INTO payments (userId, groupId, amount, method, date, reference, status, proofPath) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, groupId || null, amount, method, date, reference, 'pending', proofPath], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const paymentId = this.lastID;

            if (groupId) {
                db.get('SELECT userId FROM group_members WHERE groupId = ? AND role = "Admin"', [groupId], (err, admin) => {
                    if (admin) {
                        const msg = `New ${method} payment of R${amount} from ${req.user.id} needs verification.`;
                        db.run('INSERT INTO notifications (userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                            [admin.userId, 'Payment Alert', msg, 'warning', 0, date]);
                    }
                });
            }
            res.json({ id: paymentId, status: 'pending' });
        });
    });
});

app.post('/api/payments/:id/verify', authenticateToken, (req, res) => {
    db.get('SELECT gm.role, p.groupId, p.amount FROM group_members gm JOIN payments p ON gm.groupId = p.groupId WHERE gm.userId = ? AND p.id = ?',
        [req.user.id, req.params.id], (err, row) => {
        if (!row || row.role !== 'Admin') return res.status(403).json({ error: "Unauthorized" });

        db.serialize(() => {
            db.run('UPDATE payments SET status = "verified" WHERE id = ?', [req.params.id]);
            db.run('UPDATE stokvel_groups SET groupBalance = groupBalance + ? WHERE id = ?', [row.amount, row.groupId]);
            res.json({ success: true });
        });
    });
});
