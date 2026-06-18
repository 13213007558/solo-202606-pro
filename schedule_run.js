const { spawn } = require('child_process');

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node schedule_run.js 22:00 [command args...]');
    console.log('Example: node schedule_run.js 22:00 node run_multi_round_auto.js --rounds 3 --wait-seconds 600 --batch-size 4');
    process.exit(1);
}

const timeStr = args[0];
const cmdArgs = args.slice(1);

if (!cmdArgs.length) {
    cmdArgs.push('node', 'run_multi_round_auto.js', '--rounds', '3', '--wait-seconds', '600', '--batch-size', '4');
}

const [hours, minutes] = timeStr.split(':').map(Number);
if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.log('Invalid time format. Use HH:MM (e.g., 22:00)');
    process.exit(1);
}

function getDelay() {
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target - now;
}

const delay = getDelay();
const targetTime = new Date(Date.now() + delay);
const cmd = cmdArgs.join(' ');

console.log(`==========================================`);
console.log(`  Scheduled Task`);
console.log(`==========================================`);
console.log(`  Target time: ${timeStr}`);
console.log(`  Will run at: ${targetTime.toLocaleString()}`);
console.log(`  Waiting: ${Math.round(delay / 60000)} minutes`);
console.log(`  Command: ${cmd}`);
console.log(`==========================================`);
console.log('');

const timer = setInterval(() => {
    const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    process.stdout.write(`\r  Countdown: ${h}h ${m}m ${s}s   `);
}, 1000);

setTimeout(() => {
    clearInterval(timer);
    console.log(`\n\n  Time's up! Starting: ${cmd}\n`);

    const child = spawn(cmdArgs[0], cmdArgs.slice(1), {
        cwd: __dirname,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });

    child.on('exit', (code) => {
        console.log(`\nCommand exited with code ${code}`);
        process.exit(code || 0);
    });
}, delay);
