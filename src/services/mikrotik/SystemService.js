const BaseService = require('./BaseService');

class SystemService extends BaseService {
    
    async getResource() {
        const client = await this.connect();
        try { return await client.write('/system/resource/print'); }
        finally { await this.close(); }
    }

    // --- FUNGSI REBOOT (Dibutuhkan Sidebar) ---
    async reboot() {
        const client = await this.connect();
        try { 
            // MikroTik tidak memberikan respons balik jika sukses (karena koneksi langsung putus)
            // Jadi kita asumsikan perintah terkirim.
            await client.write('/system/reboot'); 
            return { status: 'success', message: 'Router sedang melakukan reboot' };
        } catch (e) {
            // Jika error karena koneksi putus (normal saat reboot), anggap sukses
            return { status: 'success' };
        } finally { 
            await this.close(); 
        }
    }

    // --- FUNGSI SHUTDOWN ---
    async shutdown() {
        const client = await this.connect();
        try { 
            await client.write('/system/shutdown'); 
            return { status: 'success' };
        } catch (e) {
            return { status: 'success' };
        } finally { 
            await this.close(); 
        }
    }

    async setIdentity(name) {
        const client = await this.connect();
        try {
            await client.write('/system/identity/set', [`=name=${name}`]);
            return { status: 'success', newIdentity: name };
        } finally { await this.close(); }
    }

    async setNtp(servers = 'id.pool.ntp.org') {
        const client = await this.connect();
        try {
            try {
                await client.write('/system/ntp/client/set', ['=enabled=yes', `=servers=${servers}`]);
            } catch (e) {
                await client.write('/system/ntp/client/set', ['=enabled=yes', '=primary-ntp=202.169.224.70']);
            }
            return { status: 'success', ntp: servers };
        } finally { await this.close(); }
    }
}

module.exports = SystemService;