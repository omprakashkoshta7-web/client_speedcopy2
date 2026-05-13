/**
 * Pings /health on all services and reports status.
 * Run: node scripts/health-check.js
 */
const http = require('http');

const bundledMode = process.argv.includes('--bundled');

const services = bundledMode
    ? [
          { name: 'gateway', port: 4000 },
          { name: 'user-admin-vendor-service', port: 4101 },
          { name: 'commerce-service', port: 4102 },
          { name: 'design-notification-service', port: 4103 },
      ]
    : [
          { name: 'gateway', port: 4000 },
          { name: 'auth-service', port: 4001 },
          { name: 'user-service', port: 4002 },
          { name: 'product-service', port: 4003 },
          { name: 'design-service', port: 4004 },
          { name: 'order-service', port: 4005 },
          { name: 'payment-service', port: 4006 },
          { name: 'notification-service', port: 4007 },
          { name: 'admin-service', port: 4008 },
          { name: 'delivery-service', port: 4009 },
          { name: 'vendor-service', port: 4010 },
          { name: 'finance-service', port: 4011 },
      ];

const check = (service) =>
    new Promise((resolve) => {
        const req = http.get(
            { hostname: '127.0.0.1', port: service.port, path: '/health', timeout: 4000 },
            (res) => {
                let body = '';
                res.on('data', (d) => (body += d));
                res.on('end', () => {
                    const status = res.statusCode === 200 ? '✅ UP   ' : `⚠️  ${res.statusCode}`;
                    resolve({ name: service.name, port: service.port, status });
                });
            }
        );
        req.on('error', () =>
            resolve({ name: service.name, port: service.port, status: '❌ DOWN ' })
        );
        req.on('timeout', () => {
            req.destroy();
            resolve({ name: service.name, port: service.port, status: '⏱  TIMEOUT' });
        });
    });

(async () => {
    console.log(`\n🔍 SpeedCopy Health Check${bundledMode ? ' (bundled mode)' : ''}\n`);
    const results = await Promise.all(services.map(check));
    let allUp = true;
    results.forEach(({ name, port, status }) => {
        console.log(`  ${status}  ${name.padEnd(24)} http://localhost:${port}`);
        if (!status.includes('UP')) allUp = false;
    });
    console.log('');
    if (allUp) {
        console.log('  ✅ All services are healthy!\n');
    } else {
        console.log('  ⚠️  Some services are not responding. Make sure they are started.\n');
    }
})();
