require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./config/db');
const routerRoutes = require('./routes/routerRoutes');

// Import Modular Services
const SystemService = require('./services/mikrotik/SystemService');
const InterfaceService = require('./services/mikrotik/InterfaceService');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let trafficHistory = {};

app.get('/api/router/:id/stats', async (req, res) => {
    try {
        const routerId = req.params.id;
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [routerId]);
        const routerConfig = rows[0];
        
        const system = new SystemService(routerConfig);
        const iface = new InterfaceService(routerConfig);

        const [resource, interfaces] = await Promise.all([
            system.getResource(),
            iface.getAll()
        ]);

        const currentTime = Date.now();
        const currentInterfaces = interfaces.slice(0, 5).map(i => {
            const ifaceName = i.name;
            const historyKey = `${routerId}_${ifaceName}`;
            
            const currentRx = parseInt(i['rx-byte']) || 0;
            const currentTx = parseInt(i['tx-byte']) || 0;

            let rxRate = 0;
            let txRate = 0;

            // Hitung selisih jika data sebelumnya ada
            if (trafficHistory[historyKey]) {
                const prev = trafficHistory[historyKey];
                const timeDiff = (currentTime - prev.time) / 1000; // satuan detik

                if (timeDiff > 0) {
                    // (ByteSekarang - ByteLama) = Byte yang lewat dalam jeda waktu
                    rxRate = Math.max(0, (currentRx - prev.rx) / timeDiff);
                    txRate = Math.max(0, (currentTx - prev.tx) / timeDiff);
                }
            }

            // Simpan data sekarang untuk perhitungan berikutnya
            trafficHistory[historyKey] = {
                rx: currentRx,
                tx: currentTx,
                time: currentTime
            };

            return {
                name: ifaceName,
                running: i.running,
                rx: rxRate, // Ini sekarang adalah Bytes Per Second (Bps)
                tx: txRate  // Ini sekarang adalah Bytes Per Second (Bps)
            };
        });
        
        res.json({
            cpu: resource[0]['cpu-load'],
            freeRam: (resource[0]['free-memory'] / 1024 / 1024).toFixed(1),
            uptime: resource[0]['uptime'],
            interfaces: currentInterfaces
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTES DASHBOARD ---
app.get('/dashboard/:id', async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        const routerConfig = rows[0];

        const system = new SystemService(routerConfig);
        const iface = new InterfaceService(routerConfig);

        const [resource, interfaces] = await Promise.all([
            system.getResource(),
            iface.getAll()
        ]);

        res.render('dashboard', {
            router: routerConfig,
            allRouters: allRouters,
            resource: resource[0],
            interfaces: interfaces
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.use('/api/router', routerRoutes);
app.get('/', (req, res) => res.redirect('/dashboard/1'));

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 LIVE AT http://localhost:${PORT}`);
});