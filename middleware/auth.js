const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    console.log("Verifying token with secret:", global.SECRET_KEY ? "Defined" : "Undefined (using fallback)");
    jwt.verify(token, global.SECRET_KEY || 'lokoforyou-super-secret-key', (err, user) => {
        if (err) {
            console.error("JWT Error:", err.message);
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
