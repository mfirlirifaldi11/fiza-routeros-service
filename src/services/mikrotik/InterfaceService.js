const BaseService = require('./BaseService');

class InterfaceService extends BaseService {
    async getAll() {
        const client = await this.connect();
        try { return await client.write('/interface/print'); }
        finally { await this.close(); }
    }

    async setStatus(name, isEnable) {
        const client = await this.connect();
        const action = isEnable ? 'enable' : 'disable';
        try {
            await client.write(`/interface/${action}`, [`=numbers=${name}`]);
            return { status: 'success', interface: name, action };
        } finally { await this.close(); }
    }

    async rename(oldName, newName) {
        const client = await this.connect();
        try {
            await client.write('/interface/set', [`=numbers=${oldName}`, `=name=${newName}`]);
            return { status: 'success', oldName, newName };
        } finally { await this.close(); }
    }

    async addBridge(name) {
        const client = await this.connect();
        try {
            await client.write('/interface/bridge/add', [`=name=${name}`]);
            return { status: 'success', bridge: name };
        } finally { await this.close(); }
    }
}

module.exports = InterfaceService;