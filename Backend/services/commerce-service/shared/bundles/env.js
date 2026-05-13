const fs = require('fs');

const parseEnvFile = (content) => {
    const values = {};

    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex <= 0) {
            return;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed
            .slice(separatorIndex + 1)
            .trim()
            .replace(/^['"]|['"]$/g, '');

        values[key] = value;
    });

    return values;
};

const loadEnvFile = (envPath, target = process.env) => {
    if (!fs.existsSync(envPath)) {
        return target;
    }

    const values = parseEnvFile(fs.readFileSync(envPath, 'utf8'));

    Object.entries(values).forEach(([key, value]) => {
        if (target[key] === undefined) {
            target[key] = value;
        }
    });

    return target;
};

module.exports = {
    loadEnvFile,
    parseEnvFile,
};
