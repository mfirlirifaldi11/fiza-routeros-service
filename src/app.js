const express = require('express');
const db = require('./config/db');
const MikrotikService = require('./services/MikrotikService');

const app = express();
app.use(express.json());

app.post('/api/provision', async (req, res) => {
    const { routerId } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [routerId]);
        if (rows.length === 0) return res.status(404).json({ message: "Router not found" });

        const mt = new MikrotikService(rows[0]);
        const result = await mt.setupInitial(rows[0].alias_name);
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Fiza-RouterOS Service on port ${PORT}`));