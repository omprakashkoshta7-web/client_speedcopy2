require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const swaggerSpec = require('./swagger/swagger');
const categoryRoutes = require('./routes/category.routes');
const productTypeRoutes = require('./routes/product-type.routes');
const variantRoutes = require('./routes/variant.routes');
const productRoutes = require('./routes/product.routes');
const printingRoutes = require('./routes/printing.routes');
const businessPrintingRoutes = require('./routes/business-printing.routes');
const giftingRoutes = require('./routes/gifting.routes');
const shoppingRoutes = require('./routes/shopping.routes');
const adminShoppingRoutes = require('./routes/admin-shopping.routes');
const adminGiftingRoutes = require('./routes/admin-gifting.routes');
const adminMediaRoutes = require('./routes/admin-media.routes');
const bannerRoutes = require('./routes/banner.routes');
const internalShoppingRoutes = require('./routes/internal-shopping.routes');
const internalGiftingRoutes = require('./routes/internal-gifting.routes');
const errorHandler = require('../../../shared/middlewares/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));

app.use('/api/products/categories/uploads', adminMediaRoutes);
app.use('/api/admin/categories/uploads', adminMediaRoutes);
app.use('/api/products/product-types', productTypeRoutes);
app.use('/api/admin/product-types', productTypeRoutes);
app.use('/api/products/variants', variantRoutes);
app.use('/api/admin/variants', variantRoutes);
app.use('/api/products/categories', categoryRoutes);
app.use('/api/products/printing', printingRoutes);
app.use('/api/products/business-printing', businessPrintingRoutes);
app.use('/api/printing', printingRoutes);
app.use('/api/business-printing', businessPrintingRoutes);
app.use('/api/products/gifting', giftingRoutes);
app.use('/api/products/shopping', shoppingRoutes);
app.use('/api/gifting', giftingRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/shop', shoppingRoutes);
app.use('/shopping', shoppingRoutes);
app.use('/api/admin/gifting', adminGiftingRoutes);
app.use('/api/admin/shop', adminShoppingRoutes);
app.use('/api/admin/catalog/uploads', adminMediaRoutes);
app.use('/api/admin/shop/uploads', adminMediaRoutes);
app.use('/api/admin/gifting/uploads', adminMediaRoutes);
app.use('/api/admin/banners/uploads', adminMediaRoutes);
app.use('/api/admin/banners', bannerRoutes);
app.use('/api/internal/gifting', internalGiftingRoutes);
app.use('/api/internal/shop', internalShoppingRoutes);
app.use('/api/products', productRoutes);

app.use((err, req, res, next) => {
    const isPrintingUploadRoute =
        typeof req.originalUrl === 'string' &&
        /\/api\/(products\/)?(printing|business-printing)\/upload(?:\?|$)/.test(req.originalUrl);
    const isCatalogUploadRoute =
        typeof req.originalUrl === 'string' &&
        /\/api\/admin\/(catalog|shop|gifting|banners)\/uploads(?:\/images)?(?:\?|$)/.test(
            req.originalUrl
        );

    if (!isPrintingUploadRoute && !isCatalogUploadRoute) {
        return next(err);
    }

    if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'Uploaded file is too large. Maximum allowed size is 50MB.',
        });
    }

    if (err?.message === 'Unexpected end of form') {
        return res.status(400).json({
            success: false,
            message: 'Upload request was incomplete. Please try uploading the file again.',
        });
    }

    if (err?.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message || 'Invalid upload request.',
        });
    }

    if (isCatalogUploadRoute) {
        return res.status(400).json({
            success: false,
            message: err.message || 'Invalid catalog image upload request.',
        });
    }

    return next(err);
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
