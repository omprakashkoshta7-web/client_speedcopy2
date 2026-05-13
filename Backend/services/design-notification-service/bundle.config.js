module.exports = {
    name: 'design-notification-service',
    logLabel: 'engagement-service',
    color: 'magenta',
    portEnv: 'DESIGN_NOTIFICATION_SERVICE_PORT',
    publicUrlEnv: 'DESIGN_NOTIFICATION_SERVICE_URL',
    defaultPort: 4103,
    childServices: [
        {
            key: 'design',
            name: 'design-service',
            logLabel: 'design',
            color: 'magenta',
            dir: 'services/design-notification-service/components/design-service',
            port: 4004,
            mongoEnvName: 'MONGO_URI_DESIGNS',
            publicUrlEnv: 'DESIGN_SERVICE_PUBLIC_URL',
        },
        {
            key: 'notification',
            name: 'notification-service',
            logLabel: 'notification',
            color: 'gray',
            dir: 'services/design-notification-service/components/notification-service',
            mongoEnvName: 'MONGO_URI_NOTIFICATIONS',
            publicUrlEnv: 'NOTIFICATION_SERVICE_PUBLIC_URL',
            attachServerModule: 'src/websocket/socket-manager.js',
            attachServerMethod: 'initializeSocket',
        },
    ],
    routes: [
        { prefix: '/uploads', target: 'notification' },
        { prefix: '/api/designs', target: 'design' },
        { prefix: '/api/notifications', target: 'notification' },
        {
            prefix: '/api/tickets',
            target: 'notification',
            rewrite: (requestUrl) =>
                requestUrl.replace(/^\/api\/tickets/, '/api/notifications/tickets'),
        },
        { prefix: '/ws/status', target: 'notification' },
        { prefix: '/socket.io', target: 'notification' },
    ],
};
