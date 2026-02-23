require('dotenv').config();
const express = require('express');
const routerRoutes = require('./routes/routerRoutes');

const app = express();

// Middleware
app.use(express.json());

// Load Modular Routes
app.use('/api/router', routerRoutes);

// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        message: "Fiza MikroTik API Gateway Service",
        version: "1.0.0",
        author: "Gemini AI Assistant"
    });
});

// Server Listener
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ===============================================
    🚀 FIZA SERVICE IS LIVE!
    📍 URL      : http://localhost:${PORT}
    📡 DB       : MySQL MAMP Port ${process.env.DB_PORT || 8889}
    🛠️ Modules  : Interface, IP, Route, Firewall, System
    ===============================================
    `);
});