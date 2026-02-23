const BaseService = require('./BaseService');

class IpService extends BaseService {
    async getAddresses() {
        const client = await this.connect();
        try { return await client.write('/ip/address/print'); }
        finally { await this.close(); }
    }

    async addAddress(address, interfaceName, comment = 'API_MANAGED') {
        const client = await this.connect();
        try {
            await client.write('/ip/address/add', [
                `=address=${address}`,
                `=interface=${interfaceName}`,
                `=comment=${comment}`
            ]);
            return { status: 'success', address, interface: interfaceName };
        } finally { await this.close(); }
    }

    async getDhcpServers() {
        const client = await this.connect();
        try { return await client.write('/ip/dhcp-server/print'); }
        finally { await this.close(); }
    }

    async setDns(primary, secondary) {
        const client = await this.connect();
        try {
            await client.write('/ip/dns/set', [`=servers=${primary},${secondary}`]);
            return { status: 'success', dns: [primary, secondary] };
        } finally { await this.close(); }
    }
}

module.exports = IpService;