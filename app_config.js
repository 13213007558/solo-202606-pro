const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const CONFIG_PATH = path.join(BASE_DIR, 'config.json');

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        throw new Error(
            `Missing ${CONFIG_PATH}. Copy config.example.json to config.json and configure it.`
        );
    }

    try {
        return JSON.parse(stripJsonComments(fs.readFileSync(CONFIG_PATH, 'utf8')));
    } catch (error) {
        throw new Error(`Invalid JSON in ${CONFIG_PATH}: ${error.message}`);
    }
}

function stripJsonComments(source) {
    let result = '';
    let inString = false;
    let stringQuote = '';
    let escaped = false;

    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        const next = source[i + 1];

        if (inString) {
            result += char;
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === stringQuote) {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            stringQuote = char;
            result += char;
            continue;
        }

        if (char === '/' && next === '/') {
            while (i < source.length && source[i] !== '\n') {
                i += 1;
            }
            result += '\n';
            continue;
        }

        if (char === '/' && next === '*') {
            i += 2;
            while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
                result += source[i] === '\n' ? '\n' : ' ';
                i += 1;
            }
            i += 1;
            continue;
        }

        result += char;
    }

    return result;
}

const config = loadConfig();

function getConfig(section, key, fallback) {
    return config[section] && config[section][key] !== undefined
        ? config[section][key]
        : fallback;
}

function resolveConfigPath(section, key, fallback) {
    return path.resolve(BASE_DIR, getConfig(section, key, fallback));
}

function validateProbability(value, name) {
    if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`${name} must be a number between 0 and 1`);
    }
}

function getTaskTypeProbabilities() {
    const probabilities = getConfig(
        'automation',
        'subsequent_round_task_type_probabilities',
        { bug_fix: 0.6, feature_iteration: 0.4 }
    );

    if (!probabilities || typeof probabilities !== 'object') {
        throw new Error(
            'automation.subsequent_round_task_type_probabilities must be an object'
        );
    }

    validateProbability(probabilities.bug_fix, 'bug_fix probability');
    validateProbability(
        probabilities.feature_iteration,
        'feature_iteration probability'
    );

    if (
        Math.abs(
            probabilities.bug_fix +
            probabilities.feature_iteration -
            1
        ) > 1e-9
    ) {
        throw new Error(
            'Bug fix and feature iteration probabilities must add up to 1'
        );
    }

    return probabilities;
}

module.exports = {
    BASE_DIR,
    CONFIG_PATH,
    config,
    getConfig,
    getTaskTypeProbabilities,
    resolveConfigPath,
    validateProbability,
};
