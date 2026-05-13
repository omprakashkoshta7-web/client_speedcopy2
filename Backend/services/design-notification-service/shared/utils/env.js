const isProduction = () => String(process.env.NODE_ENV || 'development') === 'production';

const getEnv = (name, fallback = undefined) => {
    const value = process.env[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
    }

    return fallback;
};

const requireEnv = (name, options = {}) => {
    const value = getEnv(name);
    if (value !== undefined) {
        return value;
    }

    if (!isProduction() && Object.prototype.hasOwnProperty.call(options, 'developmentFallback')) {
        return options.developmentFallback;
    }

    throw new Error(`${name} is required${isProduction() ? ' in production' : ''}`);
};

const requireSecret = (name, developmentFallback) =>
    requireEnv(name, { developmentFallback });

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

module.exports = {
    isProduction,
    getEnv,
    requireEnv,
    requireSecret,
    parsePositiveInt,
    parseBool,
};
