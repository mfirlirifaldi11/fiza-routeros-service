const { RouterOSAPI } = require('node-routeros');

class MikrotikService {
    constructor(config) {
        this.host = config.vpn_ip;
        this.user = config.api_user;
        this.password = config.api_pass;
        this.port = parseInt(config.api_port) || 8728;
        this.api = null;
    }

    /**
     * Helper internal untuk inisialisasi koneksi ke RouterOS
     */
    async connect() {
        this.api = new RouterOSAPI({
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            timeout: 15,
            keepalive: true
        });
        return await this.api.connect();
    }

    // ============================================================
    // 🔍 FUNGSI MONITORING (GETTERS)
    // ============================================================

    /**
     * Mengambil Resource & Identitas (Model, Versi, CPU, Uptime)
     */
    async getSystemInfo() {
        const client = await this.connect();
        try {
            const identity = await client.write('/system/identity/print');
            const routerboard = await client.write('/system/routerboard/print');
            const resource = await client.write('/system/resource/print');

            return {
                identity: identity[0].name,
                model: routerboard[0].model || 'Generic',
                serialNumber: routerboard[0]['serial-number'] || 'N/A',
                version: resource[0].version,
                uptime: resource[0].uptime,
                cpuLoad: resource[0]['cpu-load'] + '%',
                freeMemory: (parseInt(resource[0]['free-memory']) / 1024 / 1024).toFixed(1) + ' MB'
            };
        } finally {
            if (this.api) this.api.close();
        }
    }

    /**
     * Menampilkan daftar interface yang tersedia (Penting untuk cek nama bridge)
     */
    async getInterfaces() {
        const client = await this.connect();
        try {
            const data = await client.write('/interface/print');
            return data.map(i => ({
                name: i.name,
                type: i.type,
                running: i.running,
                disabled: i.disabled,
                comment: i.comment || ''
            }));
        } finally {
            if (this.api) this.api.close();
        }
    }

    /**
     * Menampilkan daftar IP Address
     */
    async getIpAddresses() {
        const client = await this.connect();
        try {
            const data = await client.write('/ip/address/print');
            return data.map(a => ({
                address: a.address,
                network: a.network,
                interface: a.interface,
                disabled: a.disabled
            }));
        } finally {
            if (this.api) this.api.close();
        }
    }

    // ============================================================
    // ⚙️ FUNGSI ATOMIC ACTION (SETTERS)
    // ============================================================

    /**
     * Hanya Mengubah Nama Identitas Router
     */
    async setIdentity(name) {
        const client = await this.connect();
        try {
            await client.write('/system/identity/set', [`=name=${name}`]);
            return { status: 'Success', action: 'Set Identity', value: name };
        } finally {
            if (this.api) this.api.close();
        }
    }

    /**
     * Konfigurasi NTP Client (Waktu Indonesia Barat)
     */
    async setNtp() {
        const client = await this.connect();
        try {
            try {
                // Coba format v6
                await client.write('/system/ntp/client/set', [
                    '=enabled=yes', 
                    '=primary-ntp=202.169.224.70', 
                    '=secondary-ntp=162.159.200.1'
                ]);
            } catch (e) {
                // Fallback format v7
                await client.write('/system/ntp/client/set', [
                    '=enabled=yes', 
                    '=servers=id.pool.ntp.org'
                ]);
            }
            return { status: 'Success', action: 'Set NTP' };
        } finally {
            if (this.api) this.api.close();
        }
    }

    /**
     * Menambahkan DHCP Alert untuk keamanan
     */
    async setDhcpAlert(interfaceName) {
        const client = await this.connect();
        try {
            // Bersihkan alert lama di interface yang sama agar tidak error "already exists"
            const exist = await client.write('/ip/dhcp-server/alert/print', [`?interface=${interfaceName}`]);
            for (const item of exist) {
                await client.write('/ip/dhcp-server/alert/remove', [`=.id=${item['.id']}`]);
            }

            await client.write('/ip/dhcp-server/alert/add', [
                `=interface=${interfaceName}`,
                '=on-alert=:log error "⚠️ ROGUE DHCP DETECTED!"',
                '=disabled=no',
                '=comment=API_MANAGED'
            ]);
            return { status: 'Success', action: 'Set DHCP Alert', interface: interfaceName };
        } finally {
            if (this.api) this.api.close();
        }
    }

    // ============================================================
    // 🚀 FUNGSI KOMPLEKS (PROVISIONING & LOAD BALANCE)
    // ============================================================

    /**
     * Inisialisasi Awal Sekali Klik
     */
    async setupInitial(identityName, localInterface = 'bridge') {
        // Kita panggil method class sendiri (Atomic)
        await this.setIdentity(identityName);
        await this.setNtp();
        await this.setDhcpAlert(localInterface);
        
        return { 
            status: 'Success', 
            message: `Provisioning for ${identityName} on interface ${localInterface} complete.` 
        };
    }

    /**
     * Recursive Failover (ISP 1 Utama, ISP 2 Backup)
     */
    async setupRecursiveFailover(gw1, gw2) {
        const client = await this.connect();
        try {
            // Hapus route lama bertanda API_MANAGED
            const routes = await client.write('/ip/route/print', ['?comment=API_MANAGED']);
            for (const r of routes) {
                await client.write('/ip/route/remove', [`=.id=${r['.id']}`]);
            }

            // ISP 1 - Primary (Check via 8.8.8.8)
            await client.write('/ip/route/add', ['=dst-address=8.8.8.8', `=gateway=${gw1}`, '=scope=10', '=comment=API_MANAGED']);
            await client.write('/ip/route/add', ['=gateway=8.8.8.8', '=check-gateway=ping', '=distance=1', '=target-scope=30', '=comment=API_MANAGED']);

            // ISP 2 - Backup (Check via 1.1.1.1)
            await client.write('/ip/route/add', ['=dst-address=1.1.1.1', `=gateway=${gw2}`, '=scope=10', '=comment=API_MANAGED']);
            await client.write('/ip/route/add', ['=gateway=1.1.1.1', '=check-gateway=ping', '=distance=2', '=target-scope=30', '=comment=API_MANAGED']);

            return { status: 'Success', message: 'Recursive Failover Configured' };
        } finally {
            if (this.api) this.api.close();
        }
    }
}

module.exports = MikrotikService;