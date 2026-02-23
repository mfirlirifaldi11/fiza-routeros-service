const BaseService = require('./BaseService');

class SystemService extends BaseService {
    
    async getResource() {
        const client = await this.connect();
        try { return await client.write('/system/resource/print'); }
        finally { await this.close(); }
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
            // Kita coba format v7 dulu, jika gagal pakai v6 (primary-ntp)
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