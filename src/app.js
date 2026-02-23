require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./config/db');

// Import Routes
const routerRoutes = require('./routes/routerRoutes');
const authRoutes = require('./routes/authRoutes');

// Import Modular Services
const SystemService = require('./services/mikrotik/SystemService');
const InterfaceService = require('./services/mikrotik/InterfaceService');

const app = express();

// --- VIEW ENGINE SETUP ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- SESSION CONFIGURATION ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'fiza_core_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Global Middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Middleware Proteksi Halaman
const protect = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// --- AUTH ROUTES ---
app.use('/', authRoutes);

// --- REAL-TIME API (STATISTICS) ---
let trafficHistory = {};

app.get('/api/router/:id/stats', protect, async (req, res) => {
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

            let rxRate = 0;
            let txRate = 0;

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

// --- DASHBOARD ROUTES (PROTECTED) ---

// 1. Dashboard Utama (Sistem)
app.get('/dashboard/:id', protect, async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.redirect('/dashboard/1');

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
        res.status(500).send(`Dashboard Error: ${err.message}`);
    }
});

// 2. Network Dashboard (MikroTik & OLT) - FIXED ReferenceError
app.get('/dashboard/:id/network', protect, async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) return res.redirect('/dashboard/1');
        const routerConfig = rows[0];

        // Dummy Data OLT & Fiber Stats
        const networkStats = {
            oltStatus: 'Online',
            totalOnu: 128,
            onuOnline: 115,
            onuOffline: 13,
            losAlarms: 2,
            temp: 42
        };

        res.render('network', {
            router: routerConfig,
            allRouters: allRouters,
            network: networkStats,
            page: 'network'
        });
    } catch (err) {
        res.status(500).send(`Network Error: ${err.message}`);
    }
});

// 3. Interfaces Management
app.get('/dashboard/:id/interfaces', protect, async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.redirect('/dashboard/1');
        
        const routerConfig = rows[0];
        const ifaceService = new InterfaceService(routerConfig);
        const interfaces = await ifaceService.getAll();

        res.render('interfaces', {
            router: routerConfig,
            allRouters: allRouters,
            interfaces: interfaces,
            page: 'network' // Agar sidebar tetap di mode network
        });
    } catch (err) {
        res.status(500).send(`Interface Error: ${err.message}`);
    }
});

// 4. Billing Dashboard
app.get('/dashboard/:id/billing', protect, async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.redirect('/dashboard/1');

        const billingData = {
            totalRevenue: 2500000,
            hotspotIncome: 1200000,
            pppoeIncome: 1300000,
            activeSubs: 45,
            recentTransactions: [
                { id: 'TX001', user: 'User-Voucher-1H', type: 'Hotspot', amount: 5000, date: '2026-02-23 10:00' },
                { id: 'TX002', user: 'Budi Santoso', type: 'PPPoE', amount: 150000, date: '2026-02-23 09:15' }
            ]
        };

        res.render('billing', {
            router: rows[0],
            allRouters: allRouters,
            billing: billingData,
            page: 'billing'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 5. Settings Dashboard
app.get('/dashboard/:id/settings', protect, async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.redirect('/dashboard/1');

        res.render('settings', {
            router: rows[0],
            allRouters: allRouters,
            page: 'settings'
        });
    } catch (err) {
        res.status(500).send(`Settings Error: ${err.message}`);
    }
});

// --- SYSTEM API ---
app.post('/api/router/reboot', protect, async (req, res) => {
    try {
        const { id } = req.body;
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [id]);
        const system = new SystemService(rows[0]);
        await system.reboot();
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// --- REDIRECTS ---
app.use('/api/router', protect, routerRoutes);
app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard/1');
    res.redirect('/login');
});

// --- SERVER START ---
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ███████╗██╗███████╗ █████╗      ██████╗ ██████╗ ██████╗ ███████╗
    ██╔════╝██║╚══███╔╝██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
    █████╗  ██║  ███╔╝ ███████║    ██║     ██║   ██║██████╔╝█████╗  
    ██╔══╝  ██║ ███╔╝  ██╔══██║    ██║     ██║   ██║██╔══██╗██╔══╝  
    ██║     ██║███████╗██║  ██║    ╚██████╗╚██████╔╝██║  ██║███████╗
    ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
    🚀 LIVE AT http://localhost:${PORT}
    `);
});