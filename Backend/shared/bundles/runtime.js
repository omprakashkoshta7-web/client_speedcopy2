const http = require('http');
const path = require('path');

const { loadEnvFile } = require('./env');
const { isProduction, parsePositiveInt } = require('../utils/env');

const rootDir = path.resolve(__dirname, '..', '..');

const legacyUrlDefaults = (bundleUrls) => ({
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
});

const colors = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
};

const colorTag = (label, color) => `${colors[color] || ''}[${label}]${colors.reset}`;

const ensureNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isTrue = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

const delay = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const loadRootEnv = () => {
    loadEnvFile(path.join(rootDir, '.env'));
    if (!isProduction()) {
        loadEnvFile(path.join(rootDir, '.env.example'));
    }
};

const findRoute = (routes, urlPath) =>
    [...routes]
        .sort((left, right) => right.prefix.length - left.prefix.length)
        .find((route) => urlPath.startsWith(route.prefix));

const snapshotEnv = (keys) =>
    keys.reduce((accumulator, key) => {
        accumulator[key] = process.env[key];
        return accumulator;
    }, {});

const applyEnv = (overrides) => {
    Object.entries(overrides).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            delete process.env[key];
            return;
        }

        process.env[key] = String(value);
    });
};

const restoreEnv = (snapshot) => {
    Object.entries(snapshot).forEach(([key, value]) => {
        if (value === undefined) {
            delete process.env[key];
            return;
        }

        process.env[key] = value;
    });
};

const defaultBundleUrls = {
    access: () =>
        process.env.USER_ADMIN_VENDOR_SERVICE_URL ||
        `http://127.0.0.1:${process.env.USER_ADMIN_VENDOR_SERVICE_PORT || 4101}`,
    commerce: () =>
        process.env.COMMERCE_SERVICE_URL ||
        `http://127.0.0.1:${process.env.COMMERCE_SERVICE_PORT || 4102}`,
    engagement: () =>
        process.env.DESIGN_NOTIFICATION_SERVICE_URL ||
        `http://127.0.0.1:${process.env.DESIGN_NOTIFICATION_SERVICE_PORT || 4103}`,
};

const resolveServiceModule = (serviceRoot, modulePath) =>
    require(path.join(serviceRoot, modulePath));

const resolveServicePackageModule = (serviceRoot, packageName) =>
    require(require.resolve(packageName, { paths: [serviceRoot] }));

const resolveServiceMongoUri = (service) =>
    process.env.MONGO_URI || process.env[service.mongoEnvName];

const buildBundleContext = (bundleConfig) => {
    loadRootEnv();

    const bundlePort = ensureNumber(
        process.env.PORT || process.env[bundleConfig.portEnv],
        bundleConfig.defaultPort
    );
    const bundlePublicUrl =
        process.env[bundleConfig.publicUrlEnv] ||
        process.env.SERVICE_PUBLIC_URL ||
        `http://127.0.0.1:${bundlePort}`;

    const bundleUrls = {
        access: defaultBundleUrls.access(),
        commerce: defaultBundleUrls.commerce(),
        engagement: defaultBundleUrls.engagement(),
    };

    applyEnv(
        Object.fromEntries(
            Object.entries(legacyUrlDefaults(bundleUrls)).filter(([key]) => !process.env[key])
        )
    );

    const childServices = bundleConfig.childServices.map((service) => ({
        ...service,
        serviceRoot: path.join(rootDir, service.dir),
    }));

    const missingMongoConfigs = childServices
        .filter((service) => !resolveServiceMongoUri(service))
        .map((service) => service.mongoEnvName || service.key);

    if (missingMongoConfigs.length) {
        throw new Error(
            `Missing MongoDB configuration for: ${missingMongoConfigs.join(', ')}`
        );
    }

    return {
        bundleConfig,
        bundlePort,
        bundlePublicUrl,
        bundleUrls,
        childServices,
        loadedServices: {},
        ready: false,
        startupError: null,
    };
};

const getConfigFromModule = (service, configModule) => {
    if (typeof service.getConfig === 'function') {
        return service.getConfig(configModule);
    }

    if (configModule && typeof configModule === 'object' && configModule.config) {
        return configModule.config;
    }

    return configModule;
};

const loadServiceApp = (context, service) => {
    const appModulePath = service.appModule || 'src/app.js';
    const configModulePath = service.configModule || 'src/config/index.js';
    const mongoUri = resolveServiceMongoUri(service);
    const serviceEnv = typeof service.env === 'function' ? service.env(context) : {};
    const envKeys = [
        'MONGO_URI',
        'SERVICE_PUBLIC_URL',
        service.publicUrlEnv,
        ...Object.keys(serviceEnv),
    ];
    const envSnapshot = snapshotEnv(envKeys);

    applyEnv({
        MONGO_URI: mongoUri,
        SERVICE_PUBLIC_URL: context.bundlePublicUrl,
        [service.publicUrlEnv]: context.bundlePublicUrl,
        ...serviceEnv,
    });

    try {
        const app = resolveServiceModule(service.serviceRoot, appModulePath);
        const configModule = resolveServiceModule(service.serviceRoot, configModulePath);
        const config = getConfigFromModule(service, configModule);
        const mongoose = resolveServicePackageModule(service.serviceRoot, 'mongoose');

        return {
            ...service,
            app,
            config,
            mongoose,
        };
    } finally {
        restoreEnv(envSnapshot);
    }
};

const getMongoUriFromConfig = (loadedService) =>
    loadedService.config?.mongoUri ||
    loadedService.config?.MONGO_URI ||
    resolveServiceMongoUri(loadedService);

const connectServiceDb = async (loadedService) => {
    const mongoUri = getMongoUriFromConfig(loadedService);

    if (!mongoUri) {
        throw new Error(`Mongo URI is missing for ${loadedService.name}`);
    }

    const mongoose = loadedService.mongoose;

    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        return;
    }

    await mongoose.connect(mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: parsePositiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10000),
        socketTimeoutMS: parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
        connectTimeoutMS: parsePositiveInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000),
        maxPoolSize: parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, 20),
        minPoolSize: parsePositiveInt(process.env.MONGO_MIN_POOL_SIZE, 2),
        heartbeatFrequencyMS: parsePositiveInt(process.env.MONGO_HEARTBEAT_FREQUENCY_MS, 10000),
        retryWrites: true,
        retryReads: true,
    });

    process.stdout.write(
        `${colorTag(loadedService.logLabel || loadedService.key, loadedService.color)} MongoDB connected: ${mongoose.connection.host} -> ${mongoose.connection.name}\n`
    );
};

const connectServiceDbWithRetry = async (loadedService) => {
    const maxAttempts = parsePositiveInt(process.env.MONGO_INIT_MAX_ATTEMPTS, 5);
    const baseDelayMs = parsePositiveInt(process.env.MONGO_INIT_RETRY_DELAY_MS, 5000);
    let lastError;
    loadedService.initializing = true;
    loadedService.initError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await connectServiceDb(loadedService);
            loadedService.initializing = false;
            loadedService.initError = null;
            return;
        } catch (error) {
            lastError = error;
            loadedService.initError = error?.message || String(error);
            const remainingAttempts = maxAttempts - attempt;

            process.stderr.write(
                `${loadedService.name} Mongo connect attempt ${attempt}/${maxAttempts} failed: ${error.message}\n`
            );

            if (remainingAttempts <= 0) {
                break;
            }

            const backoffMs = baseDelayMs * attempt;
            process.stderr.write(
                `${loadedService.name} retrying Mongo connect in ${backoffMs}ms\n`
            );
            await delay(backoffMs);
        }
    }

    loadedService.initializing = false;
    throw lastError;
};

const attachServiceServerFeatures = (loadedService, server) => {
    if (!loadedService.attachServerModule || !loadedService.attachServerMethod) {
        return;
    }

    const module = resolveServiceModule(
        loadedService.serviceRoot,
        loadedService.attachServerModule
    );
    const method = module[loadedService.attachServerMethod];

    if (typeof method !== 'function') {
        throw new Error(
            `Attach method ${loadedService.attachServerMethod} was not found for ${loadedService.name}`
        );
    }

    method(server);
};

const createHealthPayload = (context) => {
    const services = Object.values(context.loadedServices).map((service) => ({
        key: service.key,
        service: service.name,
        connected: service.mongoose.connection.readyState === 1,
        database: service.mongoose.connection.name || null,
        initializing: Boolean(service.initializing),
        initError: service.initError || null,
    }));

    return {
        status: context.startupError
            ? 'error'
            : context.ready && services.every((service) => service.connected)
              ? 'ok'
              : 'starting',
        service: context.bundleConfig.name,
        bundleUrl: context.bundlePublicUrl,
        ready: context.ready,
        startupError: context.startupError,
        services,
    };
};

const restoreRequestUrl = (req, originalState) => {
    req.url = originalState.url;
    req.originalUrl = originalState.originalUrl;
};

const dispatchToServiceApp = (loadedService, route, req, res) => {
    const originalState = {
        url: req.url,
        originalUrl: req.originalUrl,
    };

    const rewrittenUrl = route.rewrite ? route.rewrite(req.url, req) : req.url;
    req.url = rewrittenUrl;
    req.originalUrl = rewrittenUrl;

    const cleanup = () => restoreRequestUrl(req, originalState);
    res.once('finish', cleanup);
    res.once('close', cleanup);

    loadedService.app(req, res);
};

const createServer = (context) =>
    http.createServer((req, res) => {
        if (req.url === '/health') {
            const payload = createHealthPayload(context);
            res.writeHead(payload.status === 'error' ? 503 : 200, {
                'content-type': 'application/json',
            });
            res.end(JSON.stringify(payload));
            return;
        }

        if (req.url === '/ready') {
            const payload = createHealthPayload(context);
            res.writeHead(payload.ready ? 200 : 503, {
                'content-type': 'application/json',
            });
            res.end(JSON.stringify(payload));
            return;
        }

        if (req.url === '/routes') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    service: context.bundleConfig.name,
                    routes: context.bundleConfig.routes.map(({ prefix, target }) => ({
                        prefix,
                        target,
                    })),
                })
            );
            return;
        }

        if (req.url === '/api-docs') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    service: context.bundleConfig.name,
                    docs: context.childServices.map((service) => ({
                        key: service.key,
                        path: `/api-docs/${service.key}`,
                    })),
                })
            );
            return;
        }

        if ((req.url || '').startsWith('/api-docs/')) {
            const urlParts = (req.url || '').split('/');
            const serviceKey = urlParts[2];
            const loadedService = context.loadedServices[serviceKey];

            if (!loadedService) {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Swagger target not found' }));
                return;
            }

            const nestedPath = urlParts.slice(3).join('/');
            const rewrittenSwaggerPath = nestedPath ? `/api-docs/${nestedPath}` : '/api-docs/';

            dispatchToServiceApp(loadedService, { rewrite: () => rewrittenSwaggerPath }, req, res);
            return;
        }

        if (context.startupError) {
            res.writeHead(503, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    success: false,
                    message: 'Service startup failed',
                    error: context.startupError,
                })
            );
            return;
        }

        if (!context.ready) {
            res.writeHead(503, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    success: false,
                    message: 'Service is still starting',
                })
            );
            return;
        }

        const route = findRoute(context.bundleConfig.routes, req.url || '/');

        if (!route) {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Route not found' }));
            return;
        }

        const loadedService = context.loadedServices[route.target];

        if (!loadedService) {
            res.writeHead(502, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    success: false,
                    message: `Merged service target is not loaded: ${route.target}`,
                })
            );
            return;
        }

        dispatchToServiceApp(loadedService, route, req, res);
    });

const initializeBundleServices = async (context, server) => {
    const loadedServices = context.childServices.map((service) => {
        const loadedService = loadServiceApp(context, service);
        context.loadedServices[service.key] = loadedService;
        return loadedService;
    });

    const results = await Promise.allSettled(
        loadedServices.map(async (loadedService) => {
            await connectServiceDbWithRetry(loadedService);
            attachServiceServerFeatures(loadedService, server);
            return loadedService;
        })
    );

    const failedResult = results.find((result) => result.status === 'rejected');

    if (failedResult) {
        throw failedResult.reason;
    }

    context.ready = true;
    context.startupError = null;
};

const startBundle = async (bundleConfig) => {
    const context = buildBundleContext(bundleConfig);
    const server = createServer(context);
    const shouldBlockStartupInit =
        isTrue(process.env.BLOCKING_STARTUP_INIT) ||
        (isProduction() && Boolean(process.env.K_SERVICE));

    server.keepAliveTimeout = parsePositiveInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 65000);
    server.headersTimeout = parsePositiveInt(process.env.HTTP_HEADERS_TIMEOUT_MS, 66000);
    server.requestTimeout = parsePositiveInt(process.env.HTTP_REQUEST_TIMEOUT_MS, 120000);
    server.on('clientError', (error, socket) => {
        if (socket.writable) {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        }
        process.stderr.write(`${context.bundleConfig.name} clientError: ${error.message}\n`);
    });

    const onListening = () => {
        process.stdout.write(
            `${colorTag(context.bundleConfig.logLabel, context.bundleConfig.color)} Service listening on port ${context.bundlePort}\n`
        );
        process.stdout.write(
            `${colorTag(context.bundleConfig.logLabel, context.bundleConfig.color)} Public URL ${context.bundlePublicUrl}\n`
        );
    };

    const startAsyncInitialization = () => {
        initializeBundleServices(context, server)
            .then(() => {
                process.stdout.write(
                    `${colorTag(context.bundleConfig.logLabel, context.bundleConfig.color)} Child services initialized successfully\n`
                );
            })
            .catch((error) => {
                context.startupError = error?.stack || String(error);
                process.stderr.write(
                    `${context.bundleConfig.name} startupError: ${context.startupError}\n`
                );
            });
    };

    if (shouldBlockStartupInit) {
        try {
            await initializeBundleServices(context, server);
            process.stdout.write(
                `${colorTag(context.bundleConfig.logLabel, context.bundleConfig.color)} Child services initialized successfully\n`
            );
        } catch (error) {
            context.startupError = error?.stack || String(error);
            process.stderr.write(
                `${context.bundleConfig.name} startupError: ${context.startupError}\n`
            );
            throw error;
        }

        server.listen(context.bundlePort, onListening);
    } else {
        server.listen(context.bundlePort, () => {
            onListening();
            startAsyncInitialization();
        });
    }

    const shutdown = async () => {
        await Promise.all(
            Object.values(context.loadedServices).map(async (service) => {
                try {
                    await service.mongoose.connection.close();
                } catch (error) {
                    // Ignore close failures during shutdown.
                }
            })
        );

        server.close(() => process.exit(0));
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('unhandledRejection', (error) => {
        process.stderr.write(
            `${context.bundleConfig.name} unhandledRejection: ${error.stack || error}\n`
        );
        shutdown();
    });
    process.on('uncaughtException', (error) => {
        process.stderr.write(
            `${context.bundleConfig.name} uncaughtException: ${error.stack || error}\n`
        );
        shutdown();
    });
};

module.exports = {
    startBundle,
};
