const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Halaman Login
router.get('/login', (req, res) => {
    // Jika sudah login, langsung lempar ke dashboard
    if (req.session.user) return res.redirect('/dashboard/1');
    res.render('login', { error: null });
});

// Proses Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length > 0) {
            const user = rows[0];
            // Bandingkan password input dengan hash di database
            const isMatch = await bcrypt.compare(password, user.password);

            console.log('Password Match:', isMatch);

            if (isMatch) {
                // Simpan data user ke session
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    name: user.full_name,
                    role: user.role
                };
                return res.redirect('/dashboard/1');
            }
        }
        
        // Jika tidak cocok
        res.render('login', { error: 'Username atau Password salah!' });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect('/login');
    });
});

module.exports = router;