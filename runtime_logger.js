const fs = require('fs');
const path = require('path');

function formatTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
        `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function stripAnsi(value) {
    return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function startRuntimeLogger(options = {}) {
    const baseDir = options.baseDir || __dirname;
    const logsDir = options.logsDir || path.join(baseDir, 'log');
    const prefix = options.prefix || 'automation';

    fs.mkdirSync(logsDir, { recursive: true });
    const logPath = path.join(
        logsDir,
        `${prefix}_${formatTimestamp()}_${process.pid}.log`
    );

    const append = (chunk, encoding) => {
        const text = Buffer.isBuffer(chunk)
            ? chunk.toString(typeof encoding === 'string' ? encoding : 'utf8')
            : String(chunk);
        fs.appendFileSync(
            logPath,
            stripAnsi(text).replace(/\r(?!\n)/g, '\n'),
            'utf8'
        );
    };

    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = function writeStdout(chunk, encoding, callback) {
        append(chunk, encoding);
        return originalStdoutWrite(chunk, encoding, callback);
    };

    process.stderr.write = function writeStderr(chunk, encoding, callback) {
        append(chunk, encoding);
        return originalStderrWrite(chunk, encoding, callback);
    };

    console.log(`[Logger] Log file: ${logPath}`);
    console.log(`[Logger] Started: ${new Date().toISOString()}`);
    console.log(`[Logger] Command: ${process.argv.map((arg) => JSON.stringify(arg)).join(' ')}`);

    let closed = false;
    const finish = (reason) => {
        if (closed) return;
        closed = true;
        fs.appendFileSync(
            logPath,
            `\n[Logger] Finished: ${new Date().toISOString()} (${reason})\n`,
            'utf8'
        );
    };

    process.once('exit', (code) => finish(`exit code ${code}`));
    process.once('SIGINT', () => {
        finish('SIGINT');
        process.exit(130);
    });
    process.once('SIGTERM', () => {
        finish('SIGTERM');
        process.exit(143);
    });
    process.once('uncaughtException', (error) => {
        console.error('[Logger] Uncaught exception:', error && error.stack ? error.stack : error);
        finish('uncaughtException');
        process.exit(1);
    });
    process.once('unhandledRejection', (reason) => {
        console.error(
            '[Logger] Unhandled rejection:',
            reason && reason.stack ? reason.stack : reason
        );
        finish('unhandledRejection');
        process.exit(1);
    });
    process.on('warning', (warning) => {
        console.warn('[Logger] Process warning:', warning && warning.stack ? warning.stack : warning);
    });

    return { logPath, finish };
}

module.exports = { startRuntimeLogger };
