require('dotenv').config();
const mysql = require('mysql2/promise');
const { RouterOSAPI } = require('node-routeros');

async function runTest() {
    console.log('🔍 Memulai pengetesan koneksi...');

    let dbConn;
    try {
        // 1. TEST KONEKSI MYSQL
        dbConn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 8889,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('✅ MySQL Terkoneksi!');

        // 2. AMBIL DATA ROUTER
        const [rows] = await dbConn.execute('SELECT * FROM routers WHERE id = 1');
        const router = rows[0];
        
        console.log(`--- Menghubungkan ke MikroTik: ${router.alias_name} ---`);
        console.log(`📍 Host: ${router.vpn_ip}:${router.api_port}`);

        // 3. TEST KONEKSI MIKROTIK
        const api = new RouterOSAPI({
            host: router.vpn_ip,
            user: router.api_user,
            password: router.api_pass,
            port: parseInt(router.api_port),
            timeout: 10,
            keepalive: true // Tambahkan ini agar koneksi tidak langsung drop
        });

        // Tunggu koneksi
        await api.connect();
        console.log('✅ MikroTik API Terkoneksi!');
        
        // Tes baca Identity
        const identity = await api.write('/system/identity/print');
        console.log('📌 Nama Router Saat Ini:', identity[0].name);

        await api.close();
        console.log('🚀 SEMUA TES BERHASIL!');

    } catch (err) {
        console.error('❌ TES GAGAL!');
        // Menampilkan error secara mendalam
        console.log('Info Error:', err); 
    } finally {
        if (dbConn) await dbConn.end();
        process.exit();
    }
}

runTest();