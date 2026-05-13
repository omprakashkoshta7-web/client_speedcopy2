require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const { rootUploadDir } = require('./config/upload');
const deliveryRoutes = require('./routes/delivery.routes');
const swaggerSpec = require('./swagger');
const logger = require('../../../shared/utils/logger');
const { errorResponse } = require('./utils/api-response');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'delivery-service' }));
app.use('/uploads', express.static(path.join(rootUploadDir)));
app.use('/api/delivery', deliveryRoutes);

app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json(errorResponse(err.message || 'Internal server error'));
});

module.exports = app;
