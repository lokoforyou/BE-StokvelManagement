// Notification Routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const resN = await db.query('SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC', [req.user.id]);
        const rows = resN.rows;
        res.json({ 
            notifications: rows.map(n => ({ 
                ...n, 
                read: !!n.isRead 
            })), 
            unread: rows.filter(n => !n.isRead).length 
        });
    } catch (err) { 
        console.error("Notifications Fetch Error:", err);
        res.status(500).json({ error: "Notifications error" }); 
    }
});

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET "isRead" = 1 WHERE id = $1 AND "userId" = $2', [req.params.id, req.user.id]);
        res.json({ ok: true });
    } catch (err) { 
        console.error("Mark Read Error:", err);
        res.json({ ok: false }); 
    }
});

app.post('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET "isRead" = 1 WHERE "userId" = $1', [req.user.id]);
        res.json({ ok: true });
    } catch (err) { 
        console.error("Read All Error:", err);
        res.json({ ok: false }); 
    }
});
