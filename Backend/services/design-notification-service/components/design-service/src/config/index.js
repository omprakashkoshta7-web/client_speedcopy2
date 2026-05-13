require('dotenv').config();

const requireEnv = (envName) => {
    const value = process.env[envName];
    if (!value) {
        throw new Error(`${envName} is not set`);
    }

    return value;
};

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    dbUris: {
        product: process.env.PRODUCT_DB_URI,
    },
    dbNames: {
        product: 'speedcopy_products',
    },
    deriveDbUri(name) {
        const dbName = this.dbNames[name];
        if (!dbName) {
            throw new Error(`Unknown database name for service: ${name}`);
        }

        return this.mongoUri.replace(/\/([^/?]+)(\?.*)?$/, `/${dbName}$2`);
    },
    getDbUri(name) {
        return this.dbUris[name] || this.deriveDbUri(name);
    },
    publicBaseUrl: process.env.DESIGN_SERVICE_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL,
};
