const BaseService = require('./BaseService');

class RouteService extends BaseService {
    async getRoutes() {
        const client = await this.connect();
        try { return await client.write('/ip/route/print'); }
        finally { await this.close(); }
    }

    async addRoute(dstAddress, gateway, distance = 1, comment = 'API_MANAGED') {
        const client = await this.connect();
        try {
            await client.write('/ip/route/add', [
                `=dst-address=${dstAddress}`,
                `=gateway=${gateway}`,
                `=distance=${distance}`,
                `=comment=${comment}`
            ]);
            return { status: 'success', dstAddress, gateway };
        } finally { await this.close(); }
    }

    async removeApiRoutes() {
        const client = await this.connect();
        try {
            const routes = await client.write('/ip/route/print', ['?comment=API_MANAGED']);
            for (const r of routes) {
                await client.write('/ip/route/remove', [`=.id=${r['.id']}`]);
            }
            return { status: 'success', message: 'API managed routes cleared' };
        } finally { await this.close(); }
    }
}

module.exports = RouteService;