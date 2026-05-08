// Get Dashboard Data
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM payments WHERE "userId" = $1 ORDER BY date DESC LIMIT 5', [req.user.id]);
        const rows = result.rows;
        res.json({
            recentPayments: rows,
            totalSaved: rows.reduce((sum, p) => sum + Number(p.amount), 0),
            nextContributionDate: "2026-06-01"
        });
    } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        res.status(500).json({ error: "Dashboard error" });
    }
});
