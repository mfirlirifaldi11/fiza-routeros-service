const express = require('express');
const router = express.Router();
const db = require('../config/db');
const SystemService = require('../services/mikrotik/SystemService');
const InterfaceService = require('../services/mikrotik/InterfaceService');
const { protect } = require('../middleware/auth');

let trafficHistory = {};

// --- API: Statistik Real-time ---
router.get('/router/:id/stats', protect, async (req, res) => {
    try {
        const routerId = req.params.id;
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [routerId]);
        if (rows.length === 0) return res.status(404).json({ error: "Router not found" });

        const routerConfig = rows[0];
        const system = new SystemService(routerConfig);
        const iface = new InterfaceService(routerConfig);

        const [resource, interfaces] = await Promise.all([
            system.getResource(),
            iface.getAll()
        ]);

        const currentTime = Date.now();
        const currentInterfaces = interfaces.map(i => {
            const ifaceName = i.name;
            const historyKey = `${routerId}_${ifaceName}`;
            const currentRx = parseInt(i['rx-byte']) || 0;
            const currentTx = parseInt(i['tx-byte']) || 0;

            let rxRate = 0, txRate = 0;

            if (trafficHistory[historyKey]) {
                const prev = trafficHistory[historyKey];
                const timeDiff = (currentTime - prev.time) / 1000;
                if (timeDiff > 0) {
                    rxRate = Math.max(0, (currentRx - prev.rx) / timeDiff);
                    txRate = Math.max(0, (currentTx - prev.tx) / timeDiff);
                }
            }
            trafficHistory[historyKey] = { rx: currentRx, tx: currentTx, time: currentTime };
            return { name: ifaceName, running: i.running, rx: rxRate, tx: txRate };
        });
        
        res.json({
            cpu: resource[0]['cpu-load'],
            freeRam: (resource[0]['free-memory'] / 1024 / 1024).toFixed(1),
            uptime: resource[0]['uptime'],
            interfaces: currentInterfaces.slice(0, 10)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: Reboot Router ---
router.post('/router/reboot', protect, async (req, res) => {
    try {
        const { id } = req.body;
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Router not found" });

        const system = new SystemService(rows[0]);
        await system.reboot();
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

module.exports = router;