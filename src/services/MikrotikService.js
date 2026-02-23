const { RouterOSClient } = require('node-routeros');

class MikrotikService {
    constructor(config) {
        this.host = config.vpn_ip;
        this.user = config.api_user;
        this.password = config.api_pass;
        this.port = parseInt(config.api_port) || 8728;
    }

    // Helper untuk koneksi
    async connect() {
        this.api = new RouterOSClient({
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            keepalive: true
        });
        return await this.api.connect();
    }

    /**
     * 1. INITIAL PROVISIONING (Identity, NTP, DHCP Alert)
     */
    async setupInitial(identityName) {
        const client = await this.connect();
        try {
            // Identity & NTP
            await client.write('/system/identity/set', [`=name=${identityName}`]);
            await client.write('/system/ntp/client/set', ['=enabled=yes', '=servers=id.pool.ntp.org']);
            
            // DHCP Alert (Keamanan jaringan dari router asing)
            await client.write('/ip/dhcp-server/alert/add', [
                '=interface=bridge-local', // sesuaikan interface lokal
                '=on-alert=:log error "⚠️ ROGUE DHCP DETECTED!"',
                '=disabled=no'
            ]);
            
            return { status: 'Success', message: `Initial setup for ${identityName} complete.` };
        } finally {
            this.api.close();
        }
    }

    /**
     * 2. RECURSIVE LOAD BALANCE (Failover Cerdas)
     * gateway1 & gateway2 adalah IP Gateway ISP mitra
     */
    async setupRecursiveFailover(gw1, gw2) {
        const client = await this.connect();
        try {
            // Hapus route default lama jika ada
            await client.write('/ip/route/remove', ['[find where comment="API_MANAGED"]']);

            // Jalur Utama via Google DNS 8.8.8.8
            await client.write('/ip/route/add', [
                '=dst-address=8.8.8.8', `=gateway=${gw1}`, '=scope=10', '=comment=API_MANAGED'
            ]);
            await client.write('/ip/route/add', [
                '=gateway=8.8.8.8', '=check-gateway=ping', '=distance=1', '=target-scope=30', '=comment=API_MANAGED'
            ]);

            // Jalur Cadangan via Cloudflare DNS 1.1.1.1
            await client.write('/ip/route/add', [
                '=dst-address=1.1.1.1', `=gateway=${gw2}`, '=scope=10', '=comment=API_MANAGED'
            ]);
            await client.write('/ip/route/add', [
                '=gateway=1.1.1.1', '=check-gateway=ping', '=distance=2', '=target-scope=30', '=comment=API_MANAGED'
            ]);

            return { status: 'Success', message: 'Recursive Failover configured.' };
        } finally {
            this.api.close();
        }
    }
}

module.exports = MikrotikService;