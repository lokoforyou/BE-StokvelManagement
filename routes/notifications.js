// Notification Routes
app.get('/api/notifications', authenticateToken, (req, res) => {
    db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            notifications: (rows || []).map(n => ({
                ...n,
                read: !!n.isRead
            })),
            unread: (rows || []).filter(n => !n.isRead).length
        });
    });
});

app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
    db.run('UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
        res.json({ ok: !err });
    });
});

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
    db.run('UPDATE notifications SET isRead = 1 WHERE userId = ?', [req.user.id], (err) => {
        res.json({ ok: !err });
    });
});
