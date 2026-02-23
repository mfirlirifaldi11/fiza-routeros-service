const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Import Semua Modular Services
const InterfaceService = require('../services/mikrotik/InterfaceService');
const IpService = require('../services/mikrotik/IpService');
const RouteService = require('../services/mikrotik/RouteService');
const FirewallService = require('../services/mikrotik/FirewallService');
const SystemService = require('../services/mikrotik/SystemService');

// Helper untuk ambil config router dari DB
async function getRouter(id) {
    const [rows] = await db.execute('SELECT * FROM routers WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error("Router ID tidak ditemukan di database");
    return rows[0];
}

// ==========================================
// 🔌 INTERFACE ROUTES
// ==========================================
router.get('/:id/interfaces', async (req, res) => {
    try {
        const config = await getRouter(req.params.id);
        const service = new InterfaceService(config);
        const data = await service.getAll();
        res.json({ status: 'success', data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/interface/status', async (req, res) => {
    const { id, name, active } = req.body;
    try {
        const config = await getRouter(id);
        const service = new InterfaceService(config);
        const result = await service.setStatus(name, active);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🌐 IP & DHCP ROUTES
// ==========================================
router.get('/:id/ip-address', async (req, res) => {
    try {
        const config = await getRouter(req.params.id);
        const service = new IpService(config);
        const data = await service.getAddresses();
        res.json({ status: 'success', data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ip-address/add', async (req, res) => {
    const { id, address, interfaceName } = req.body;
    try {
        const config = await getRouter(id);
        const service = new IpService(config);
        const result = await service.addAddress(address, interfaceName);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🛡️ FIREWALL ROUTES
// ==========================================
router.post('/firewall/masquerade', async (req, res) => {
    const { id, outInterface } = req.body;
    try {
        const config = await getRouter(id);
        const service = new FirewallService(config);
        const result = await service.addMasquerade(outInterface);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ⚙️ SYSTEM ROUTES
// ==========================================
router.get('/:id/resource', async (req, res) => {
    try {
        const config = await getRouter(req.params.id);
        const service = new SystemService(config);
        const data = await service.getResource();
        res.json({ status: 'success', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/system/init', async (req, res) => {
    const { id, identity } = req.body;
    try {
        const config = await getRouter(id);
        const service = new SystemService(config);
        await service.setIdentity(identity || config.alias_name);
        await service.setNtp();
        res.json({ status: 'success', message: "Identity & NTP Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;