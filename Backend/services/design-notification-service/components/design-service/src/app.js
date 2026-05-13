require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');
const designRoutes = require('./routes/design.routes');
const customizationRoutes = require('./routes/customization.routes');
const errorHandler = require('../../../shared/middlewares/error.middleware');
const path = require('path');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'design-service' }));
app.use('/api/designs', designRoutes);
app.use('/api/designs', customizationRoutes);
app.use((err, req, res, next) => {
    const isCustomizationUpload =
        typeof req.originalUrl === 'string' &&
        /\/api\/designs\/customizations\/[^/]+\/assets(?:\?|$)/.test(req.originalUrl);

    if (!isCustomizationUpload) return next(err);

    if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'Uploaded file is too large. Maximum allowed size is 15MB.',
        });
    }

    if (err?.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message || 'Invalid upload request.',
        });
    }

    return res.status(400).json({
        success: false,
        message: err.message || 'Invalid customization asset upload request.',
    });
});
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);
module.exports = app;
