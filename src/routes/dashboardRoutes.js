const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth'); // Pastikan sudah buat file ini

// Semua route di bawah ini otomatis diawali dengan /dashboard
router.get('/:id', protect, dashboardController.getSystemDashboard);
router.get('/:id/network', protect, dashboardController.getNetworkDashboard);
router.get('/:id/interfaces', protect, dashboardController.getInterfaceManagement);
router.get('/:id/billing', protect, dashboardController.getBillingDashboard);
router.get('/:id/settings', protect, dashboardController.getSettingsDashboard);

module.exports = router;