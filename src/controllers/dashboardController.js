const db = require('../config/db');
const SystemService = require('../services/mikrotik/SystemService');
const InterfaceService = require('../services/mikrotik/InterfaceService');

// 1. Dashboard Utama (Sistem)
exports.getSystemDashboard = async (req, res) => {
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
            interfaces: interfaces,
            page: 'system'
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send(`Dashboard Error: ${err.message}`);
    }
};

// 2. Network Dashboard (MikroTik & OLT)
exports.getNetworkDashboard = async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) return res.redirect('/dashboard/1');
        
        const networkStats = {
            oltStatus: 'Online',
            totalOnu: 128,
            onuOnline: 115,
            onuOffline: 13,
            losAlarms: 2,
            temp: 42
        };

        res.render('network', {
            router: rows[0],
            allRouters: allRouters,
            network: networkStats,
            page: 'network'
        });
    } catch (err) {
        res.status(500).send(`Network Error: ${err.message}`);
    }
};

// 3. Interfaces Management
exports.getInterfaceManagement = async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) return res.redirect('/dashboard/1');
        
        const ifaceService = new InterfaceService(rows[0]);
        const interfaces = await ifaceService.getAll();

        res.render('interfaces', {
            router: rows[0],
            allRouters: allRouters,
            interfaces: interfaces,
            page: 'network'
        });
    } catch (err) {
        res.status(500).send(`Interface Error: ${err.message}`);
    }
};

// 4. Billing Dashboard
exports.getBillingDashboard = async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);
        
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
};

// 5. Settings Dashboard
exports.getSettingsDashboard = async (req, res) => {
    try {
        const [allRouters] = await db.execute('SELECT id, alias_name FROM routers');
        const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [req.params.id]);

        res.render('settings', {
            router: rows[0],
            allRouters: allRouters,
            page: 'settings'
        });
    } catch (err) {
        res.status(500).send(`Settings Error: ${err.message}`);
    }
};