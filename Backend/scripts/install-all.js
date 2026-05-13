/**
 * Runs npm install in root, gateway, and each copied component service.
 * Component-local installs preserve isolated package instances such as mongoose.
 */
const { execSync } = require('child_process');
const path = require('path');

const dirs = [
    '.',
    'gateway',
    'services/user-admin-vendor-service/components/auth-service',
    'services/user-admin-vendor-service/components/user-service',
    'services/user-admin-vendor-service/components/admin-service',
    'services/user-admin-vendor-service/components/vendor-service',
    'services/commerce-service/components/product-service',
    'services/commerce-service/components/order-service',
    'services/commerce-service/components/payment-service',
    'services/commerce-service/components/delivery-service',
    'services/commerce-service/components/finance-service',
    'services/design-notification-service/components/design-service',
    'services/design-notification-service/components/notification-service',
];

const root = path.join(__dirname, '..');

for (const dir of dirs) {
    const full = path.join(root, dir);
    console.log(`\n Installing in ${dir}...`);
    try {
        execSync('npm install', { cwd: full, stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed in ${dir}:`, err.message);
    }
}

console.log('\n All dependencies installed.');
