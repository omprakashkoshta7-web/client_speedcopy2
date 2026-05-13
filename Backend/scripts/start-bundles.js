const path = require('path');
const { spawn } = require('child_process');
const { loadEnvFile } = require('../shared/bundles/env');
const { isProduction } = require('../shared/utils/env');

const rootDir = path.resolve(__dirname, '..');
loadEnvFile(path.join(rootDir, '.env'));
if (!isProduction()) {
    loadEnvFile(path.join(rootDir, '.env.example'));
}

const isDev = process.argv.includes('--dev');

const bundleUrls = {
    access: process.env.USER_ADMIN_VENDOR_SERVICE_URL || 'http://127.0.0.1:4101',
    commerce: process.env.COMMERCE_SERVICE_URL || 'http://127.0.0.1:4102',
    engagement: process.env.DESIGN_NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:4103',
};

const nodemonBin = require.resolve('nodemon/bin/nodemon.js');

const groupedServiceUrls = {
    AUTH_SERVICE_URL: bundleUrls.access,
    USER_SERVICE_URL: bundleUrls.access,
    ADMIN_SERVICE_URL: bundleUrls.access,
    VENDOR_SERVICE_URL: bundleUrls.access,
    PRODUCT_SERVICE_URL: bundleUrls.commerce,
    ORDER_SERVICE_URL: bundleUrls.commerce,
    PAYMENT_SERVICE_URL: bundleUrls.commerce,
    DELIVERY_SERVICE_URL: bundleUrls.commerce,
    FINANCE_SERVICE_URL: bundleUrls.commerce,
    DESIGN_SERVICE_URL: bundleUrls.engagement,
    NOTIFICATION_SERVICE_URL: bundleUrls.engagement,
};

const services = [
    {
        name: 'user-admin-vendor-service',
        script: 'services/user-admin-vendor-service/server.js',
        color: 'cyan',
        env: {
            PORT: '4101',
            USER_ADMIN_VENDOR_SERVICE_PORT: '4101',
            USER_ADMIN_VENDOR_SERVICE_URL: bundleUrls.access,
            COMMERCE_SERVICE_URL: bundleUrls.commerce,
            DESIGN_NOTIFICATION_SERVICE_URL: bundleUrls.engagement,
            ...groupedServiceUrls,
        },
    },
    {
        name: 'commerce-service',
        script: 'services/commerce-service/server.js',
        color: 'yellow',
        env: {
            PORT: '4102',
            COMMERCE_SERVICE_PORT: '4102',
            USER_ADMIN_VENDOR_SERVICE_URL: bundleUrls.access,
            COMMERCE_SERVICE_URL: bundleUrls.commerce,
            DESIGN_NOTIFICATION_SERVICE_URL: bundleUrls.engagement,
            ...groupedServiceUrls,
        },
    },
    {
        name: 'design-notification-service',
        script: 'services/design-notification-service/server.js',
        color: 'magenta',
        env: {
            PORT: '4103',
            DESIGN_NOTIFICATION_SERVICE_PORT: '4103',
            USER_ADMIN_VENDOR_SERVICE_URL: bundleUrls.access,
            COMMERCE_SERVICE_URL: bundleUrls.commerce,
            DESIGN_NOTIFICATION_SERVICE_URL: bundleUrls.engagement,
            ...groupedServiceUrls,
        },
    },
    {
        name: 'gateway',
        script: 'gateway/src/server.js',
        color: 'green',
        env: {
            PORT: '4000',
            USER_ADMIN_VENDOR_SERVICE_URL: bundleUrls.access,
            COMMERCE_SERVICE_URL: bundleUrls.commerce,
            DESIGN_NOTIFICATION_SERVICE_URL: bundleUrls.engagement,
            ...groupedServiceUrls,
        },
    },
];

const colors = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
};

const tag = (name, color) => `${colors[color] || ''}[${name}]${colors.reset}`;
const withNodeOption = (existingValue, option) => {
    const tokens = String(existingValue || '')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);

    if (!tokens.includes(option)) {
        tokens.push(option);
    }

    return tokens.join(' ');
};

const children = services.map((service) => {
    const command = process.execPath;
    const args = isDev ? [nodemonBin, service.script] : [service.script];
    const nodeOptions = isDev
        ? withNodeOption(process.env.NODE_OPTIONS, '--disable-warning=DEP0169')
        : process.env.NODE_OPTIONS;

    const child = spawn(command, args, {
        cwd: rootDir,
        env: {
            ...process.env,
            ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
            ...service.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => {
        chunk
            .toString()
            .trim()
            .split('\n')
            .forEach((line) => {
                if (line.trim()) {
                    process.stdout.write(`${tag(service.name, service.color)} ${line}\n`);
                }
            });
    });

    child.stderr.on('data', (chunk) => {
        chunk
            .toString()
            .trim()
            .split('\n')
            .forEach((line) => {
                if (line.trim()) {
                    process.stdout.write(
                        `${tag(service.name, service.color)} ${colors.red}${line}${colors.reset}\n`
                    );
                }
            });
    });

    child.on('exit', (code) => {
        if (code !== null && code !== 0) {
            process.stdout.write(
                `${tag(service.name, service.color)} ${colors.red}Exited with code ${code}${colors.reset}\n`
            );
        }
    });

    return child;
});

const shutdown = () => {
    children.forEach((child) => {
        try {
            child.kill('SIGTERM');
        } catch (error) {
            // Ignore process shutdown errors.
        }
    });
    setTimeout(() => process.exit(0), 1000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
