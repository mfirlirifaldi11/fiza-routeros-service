require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

// Import Routes
// Pastikan file-file ini ada di folder src/routes/
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');

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
        secure: false, // Set true jika menggunakan HTTPS
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Global Locals Middleware (Agar user bisa diakses di semua EJS)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// --- ROUTES REGISTRATION ---

// 1. Auth (Login/Logout)
app.use('/', authRoutes);

// 2. Dashboard (Semua route /dashboard/...)
app.use('/dashboard', dashboardRoutes);

// 3. API (Semua route /api/...)
app.use('/api', apiRoutes);

// --- ROOT REDIRECT ---
app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard/1');
    res.redirect('/login');
});

// --- ERROR HANDLING (Agar server tidak mati saat ada error) ---
app.use((err, req, res, next) => {
    console.error('❌ GLOBAL ERROR:', err.stack);
    res.status(500).send('Something broke!');
});

// --- SERVER START ---
const PORT = process.env.APP_PORT || 3000;

// Gunakan 0.0.0.0 agar bisa diakses dari jaringan lokal/Docker
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ███████╗██╗███████╗ █████╗      ██████╗ ██████╗ ██████╗ ███████╗
    ██╔════╝██║╚══███╔╝██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
    █████╗  ██║  ███╔╝ ███████║    ██║     ██║   ██║██████╔╝█████╗  
    ██╔══╝  ██║ ███╔╝  ██╔══██║    ██║     ██║   ██║██╔══██╗██╔══╝  
    ██║     ██║███████╗██║  ██║    ╚██████╗╚██████╔╝██║  ██║███████╗
    ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
    🚀 SYSTEM CLEANED & REFACTORED
    🔗 LOCAL DEV: http://localhost:${PORT}
    `);
});