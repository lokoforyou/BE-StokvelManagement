// Get Dashboard Data
app.get('/api/dashboard/summary', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM payments WHERE userId = ? ORDER BY date DESC LIMIT 5`, [req.user.id], (err, rows) => {
        res.json({
            recentPayments: rows,
            totalSaved: rows.reduce((sum, p) => sum + p.amount, 0),
            nextContributionDate: "2026-06-01"
        });
    });
});
