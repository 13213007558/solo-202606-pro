const { listWindows, normalizeAppName } = require('./platform_helpers');

let getConfig = () => '';
try {
    ({ getConfig } = require('./app_config'));
} catch (error) {}

const traeExecutable = getConfig('paths', 'trae_executable', '');
const traeAppName = normalizeAppName(
    traeExecutable,
    getConfig('paths', 'trae_app_name', '')
);

const output = listWindows({ traeAppName });

console.log('All visible Trae windows:');
console.log('=========================');

const lines = output.trim().split(/\r?\n/).filter(line => line.trim());
if (!lines.length) {
    console.log(`No Trae windows found for app name: ${traeAppName}`);
    process.exit(0);
}

for (const line of lines) {
    if (line.toLowerCase().includes('trae') || /auto\d+/i.test(line)) {
        console.log('>>> ' + line);
    } else {
        console.log('    ' + line);
    }
}
