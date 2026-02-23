const BaseService = require('./BaseService');

class FirewallService extends BaseService {
    
    // --- [ NAT RULES ] ---

    async getNatRules() {
        const client = await this.connect();
        try { return await client.write('/ip/firewall/nat/print'); }
        finally { await this.close(); }
    }

    /**
     * Menambah NAT Masquerade (Agar LAN bisa internetan)
     */
    async addMasquerade(outInterface, comment = 'API_MANAGED') {
        const client = await this.connect();
        try {
            await client.write('/ip/firewall/nat/add', [
                '=chain=srcnat',
                `=out-interface=${outInterface}`,
                '=action=masquerade',
                `=comment=${comment}`
            ]);
            return { status: 'success', action: 'masquerade', interface: outInterface };
        } finally { await this.close(); }
    }

    // --- [ FILTER RULES ] ---

    async getFilterRules() {
        const client = await this.connect();
        try { return await client.write('/ip/firewall/filter/print'); }
        finally { await this.close(); }
    }

    /**
     * Block IP tertentu
     */
    async blockIp(srcAddress, comment = 'API_MANAGED') {
        const client = await this.connect();
        try {
            await client.write('/ip/firewall/filter/add', [
                '=chain=forward',
                `=src-address=${srcAddress}`,
                '=action=drop',
                `=comment=${comment}`
            ]);
            return { status: 'success', blocked: srcAddress };
        } finally { await this.close(); }
    }

    // --- [ ADDRESS LISTS ] ---

    /**
     * Tambah IP ke Address List (Berguna untuk limitasi massal/isolasi)
     */
    async addAddressList(listName, address, comment = 'API_MANAGED') {
        const client = await this.connect();
        try {
            await client.write('/ip/firewall/address-list/add', [
                `=list=${listName}`,
                `=address=${address}`,
                `=comment=${comment}`
            ]);
            return { status: 'success', list: listName, address };
        } finally { await this.close(); }
    }

    /**
     * Bersihkan semua rule firewall yang dibuat oleh API
     */
    async clearApiFirewall() {
        const client = await this.connect();
        try {
            const sections = ['nat', 'filter', 'mangle', 'address-list'];
            let removedCount = 0;

            for (const section of sections) {
                const rules = await client.write(`/ip/firewall/${section}/print`, ['?comment=API_MANAGED']);
                for (const r of rules) {
                    await client.write(`/ip/firewall/${section}/remove`, [`=.id=${r['.id']}`]);
                    removedCount++;
                }
            }
            return { status: 'success', removedRules: removedCount };
        } finally { await this.close(); }
    }
}

module.exports = FirewallService;