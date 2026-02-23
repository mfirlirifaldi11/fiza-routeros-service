const { RouterOSAPI } = require('node-routeros');

class BaseService {
    constructor(config) {
        this.config = config;
        this.api = null;
    }

    async connect() {
        this.api = new RouterOSAPI({
            host: this.config.vpn_ip,
            user: this.config.api_user,
            password: this.config.api_pass,
            port: parseInt(this.config.api_port) || 8728,
            timeout: 15,
            keepalive: true
        });
        return await this.api.connect();
    }

    async close() {
        if (this.api) {
            await this.api.close();
            this.api = null;
        }
    }
}

module.exports = BaseService;