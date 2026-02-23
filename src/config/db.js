const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 8889, // <-- PASTIKAN BARIS INI ADA
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'fiza_routeros_db',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = db;