require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger/swagger');
const { defaultLimiter } = require('./middlewares/rate-limit');
const errorHandler = require('./middlewares/error-handler');
const config = require('./config');
const { optionalAuth } = require('./middlewares/auth');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const appRoutes = require('./routes/app.routes');
const shopRoutes = require('./routes/shop.routes');
const giftingRoutes = require('./routes/gifting.routes');
const shoppingRoutes = require('./routes/shopping.routes');
const printingRoutes = require('./routes/printing.routes');
const businessPrintingRoutes = require('./routes/business-printing.routes');
const cartRoutes = require('./routes/cart.routes');
const designRoutes = require('./routes/design.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminShopRoutes = require('./routes/admin-shop.routes');
const adminRoutes = require('./routes/admin.routes');
const staffRoutes = require('./routes/staff.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const vendorRoutes = require('./routes/vendor.routes');
const financeRoutes = require('./routes/finance.routes');
const ticketRoutes = require('./routes/ticket.routes');
const uploadRoutes = require('./routes/upload.routes');
const { buildProxyReqOptDecorator, createServiceProxy } = require('./utils/proxy');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxyHops);

const redirectToService =
    (targetUrl) =>
    (req, res) => {
        const redirectUrl = new URL(req.originalUrl, targetUrl).toString();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.redirect(302, redirectUrl);
    };

const proxyUploadsToService = (targetUrl) =>
    createServiceProxy(targetUrl, {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyReqOptDecorator: buildProxyReqOptDecorator(targetUrl),
        userResHeaderDecorator: (headers) => ({
            ...headers,
            'access-control-allow-origin': '*',
            'cross-origin-resource-policy': 'cross-origin',
        }),
        onProxyRes: (proxyRes, req, res) => {
            if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            }
        },
    });

// ─── Security & Parsing ────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: config.corsOrigins === '*' ? true : config.corsOrigins.split(',').map((value) => value.trim()),
        credentials: true,
    })
);
app.use(compression());
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.urlEncodedBodyLimit }));
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    req.id = requestId;
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
});
app.use(morgan('dev'));
app.use(optionalAuth);
app.use(defaultLimiter);

// ─── Swagger ───────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Health ────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));
app.get('/ready', (req, res) => res.json({ status: 'ready', service: 'gateway' }));
app.use('/uploads/users', redirectToService(config.services.user));
app.use('/uploads/vendors', redirectToService(config.services.vendor));
app.use('/uploads/admin', redirectToService(config.services.admin));
app.use('/uploads/delivery', redirectToService(config.services.commerce));
app.use('/uploads/notifications', redirectToService(config.services.notification));
app.use('/uploads', proxyUploadsToService(config.services.product));

// ─── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/app', appRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/printing', printingRoutes);
app.use('/api/business-printing', businessPrintingRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/gifting', giftingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminShopRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api', financeRoutes);
app.use('/api/upload', uploadRoutes);

// ─── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
