const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const readline = require('readline');
const os = require('os');
const {
    getConfig,
    getTaskTypeProbabilities,
    resolveConfigPath,
    validateProbability,
} = require('./app_config');
const { startRuntimeLogger } = require('./runtime_logger');
const platform = require('./platform_helpers');

const runtimeLogger = startRuntimeLogger({
    baseDir: __dirname,
    logsDir: resolveConfigPath('paths', 'logs_directory', 'log'),
    prefix: 'multi_round',
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function question(prompt) { return new Promise(resolve => rl.question(prompt, resolve)); }
function fmtTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
}

// ============================================================
// CONFIG
// ============================================================
const TRAE_EXE = getConfig('paths', 'trae_executable', '');
const TRAE_APP_NAME = platform.normalizeAppName(
    TRAE_EXE,
    getConfig('paths', 'trae_app_name', '')
);
const PYTHON_EXE = platform.expandHome(getConfig('paths', 'python_executable', 'python'));

// 默认参数（可通过命令行覆盖）
let ROUNDS = getConfig('automation', 'rounds', 3);
let BATCH_SIZE = getConfig('automation', 'batch_size', 8);
let WAIT_SECONDS = getConfig('automation', 'multi_round_wait_seconds', 600);
let SWITCH_INTERVAL = getConfig('automation', 'switch_interval_seconds', 15);
let STOP_DWELL = getConfig('automation', 'stop_dwell_seconds', 10);
let UPLOAD_TIMEOUT = getConfig('automation', 'upload_timeout_seconds', 10);
let TRACE_TIMEOUT = getConfig('automation', 'trace_timeout_seconds', 10);
let PROMPT_GEN_TIME = getConfig('automation', 'prompt_generation_wait_seconds', 60);
const FINAL_ROUND_SATISFACTION_PROBABILITY = getConfig(
    'automation', 'final_round_satisfaction_probability', 0.6
);
const TASK_TYPE_PROBABILITIES = getTaskTypeProbabilities();
validateProbability(
    FINAL_ROUND_SATISFACTION_PROBABILITY,
    'automation.final_round_satisfaction_probability'
);

// Git 配置
const GIT_REPO = getConfig('github', 'repository', '');
const GIT_BRANCH = getConfig('github', 'branch', 'main');
const FOLDER_PREFIX = getConfig('github', 'folder_prefix', 'cp1');

// ============================================================
// 解析命令行参数
// ============================================================
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], val = parseInt(argv[i + 1]);
    if (isNaN(val)) continue;
    switch (key) {
        case '--rounds': ROUNDS = val; break;
        case '--batch-size': BATCH_SIZE = val; break;
        case '--wait-seconds': WAIT_SECONDS = val; break;
        case '--switch-interval': SWITCH_INTERVAL = val; break;
        case '--stop-dwell': STOP_DWELL = val; break;
        case '--upload-timeout': UPLOAD_TIMEOUT = val; break;
        case '--trace-timeout': TRACE_TIMEOUT = val; break;
        case '--prompt-gen-time': PROMPT_GEN_TIME = val; break;
    }
}

const BASE_DIR = __dirname;
const EXAMPLE_DIR = resolveConfigPath('paths', 'example_directory', 'example');
const TASKS_DIR = resolveConfigPath('paths', 'tasks_directory', 'tasks');
const TRAE_LAUNCH_TARGET = platform.IS_MACOS
    ? platform.firstExistingMacTraeTarget(TRAE_EXE)
    : TRAE_EXE;

fs.mkdirSync(EXAMPLE_DIR, { recursive: true });
fs.mkdirSync(TASKS_DIR, { recursive: true });

// ============================================================
// Platform automation
// ============================================================
function findWindowHandle(targetName) {
    return platform.findWindowHandle(targetName, { traeAppName: TRAE_APP_NAME });
}

function activateWindow(handleStr) {
    return platform.activateWindow(handleStr, { traeAppName: TRAE_APP_NAME });
}

function closeWindow(handleStr) {
    return platform.closeWindow(handleStr, { traeAppName: TRAE_APP_NAME });
}

function sendPrompt(handleStr, tempPromptFile) {
    return platform.sendPrompt(handleStr, tempPromptFile, { traeAppName: TRAE_APP_NAME });
}

function runHelper(action, extraArgs = []) {
    const helperPath = path.join(__dirname, 'trae_helper.py');
    const args = [PYTHON_EXE, helperPath, '--action', action, ...extraArgs];
    let output = '';
    try {
        output = execFileSync(args[0], args.slice(1), {
            encoding: 'utf8', timeout: action === 'trace' ? 20000 : 120000,
            stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024
        });
    } catch (e) { output = e.stdout || ''; }
    const lines = output.trim().split(/\r?\n/).filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if ((line.startsWith('{') && line.endsWith('}')) || (line.startsWith('[') && line.endsWith(']'))) {
            try { return JSON.parse(line); } catch (e) { continue; }
        }
    }
    return { success: false, error: "No valid JSON output from helper" };
}

function runMultiRoundHelper(action, extraArgs = []) {
    const helperPath = path.join(__dirname, 'multi_round_helper.py');
    // 将 --tasks-json 的值写入临时文件，避免命令行长度和引号问题
    const processedArgs = [];
    for (let i = 0; i < extraArgs.length; i++) {
        if (extraArgs[i] === '--tasks-json' && i + 1 < extraArgs.length) {
            const tmpJsonFile = path.join(os.tmpdir(), 'tasks_json_' + Date.now() + '.json');
            fs.writeFileSync(tmpJsonFile, extraArgs[i + 1], 'utf8');
            processedArgs.push('--tasks-json-file', tmpJsonFile);
            i++;
        } else {
            processedArgs.push(extraArgs[i]);
        }
    }
    const args = [PYTHON_EXE, helperPath, '--action', action, ...processedArgs];
    let output = '';
    try {
        output = execFileSync(args[0], args.slice(1), {
            encoding: 'utf8', timeout: 600000,
            stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024
        });
    } catch (e) { output = e.stdout || ''; }
    const lines = output.trim().split(/\r?\n/).filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if ((line.startsWith('{') && line.endsWith('}')) || (line.startsWith('[') && line.endsWith(']'))) {
            try { return JSON.parse(line); } catch (e) { continue; }
        }
    }
    return { success: false, error: "No valid JSON output from multi_round_helper" };
}

// ============================================================
// 结果文件操作
// ============================================================
function loadResult(taskPath, taskName) {
    const fp = path.join(taskPath, `result_${taskName}.json`);
    try {
        if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {}
    return { task_name: taskName, rounds: [] };
}

function saveResult(taskPath, taskName, data) {
    const fp = path.join(taskPath, `result_${taskName}.json`);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function getRoundData(result, roundNum) {
    return (result.rounds || []).find(r => r.round === roundNum) || null;
}

function setRoundData(result, roundNum, data) {
    if (!result.rounds) result.rounds = [];
    const idx = result.rounds.findIndex(r => r.round === roundNum);
    if (idx >= 0) result.rounds[idx] = data;
    else result.rounds.push(data);
}

function isFolderEmpty(folderPath) {
    if (!fs.existsSync(folderPath)) return true;
    return fs.readdirSync(folderPath).length === 0;
}

function moveInitialPromptsAfterFinalRound(tasks) {
    let moved = 0;
    let skipped = 0;

    for (const task of tasks) {
        if (!task.promptFile || !fs.existsSync(task.promptFile)) {
            skipped++;
            console.log(`  [${task.name}] Source prompt already moved or missing`);
            continue;
        }

        const dst = path.join(task.path, 'prompt_1.json');
        try {
            fs.copyFileSync(task.promptFile, dst);
            fs.unlinkSync(task.promptFile);
            moved++;
            console.log(`  [${task.name}] Moved ${path.basename(task.promptFile)} -> prompt_1.json`);
        } catch (e) {
            skipped++;
            console.log(`  [${task.name}] Failed to move ${path.basename(task.promptFile)}: ${e.message}`);
        }
    }

    return { moved, skipped };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('==========================================');
    console.log('  TRAE MULTI-ROUND AUTO SEND + COLLECT');
    console.log('==========================================');
    console.log(`  Platform: ${process.platform}/${process.arch}`);
    console.log(`  Trae launch: ${TRAE_LAUNCH_TARGET || '(not configured)'}`);
    console.log(`  Trae app name: ${TRAE_APP_NAME}`);
    console.log(`  Python: ${PYTHON_EXE}`);
    console.log(`  Rounds: ${ROUNDS}  |  Batch: ${BATCH_SIZE}  |  Wait: ${WAIT_SECONDS}s`);
    console.log(`  Switch: ${SWITCH_INTERVAL}s  |  Stop dwell: ${STOP_DWELL}s`);
    console.log(
        `  Later rounds: Bug ${TASK_TYPE_PROBABILITIES.bug_fix}, ` +
        `Feature ${TASK_TYPE_PROBABILITIES.feature_iteration}`
    );
    console.log(`  Final round satisfaction probability: ${FINAL_ROUND_SATISFACTION_PROBABILITY}`);
    console.log('');

    // 扫描全部提示词
    const allPromptFiles = fs.readdirSync(EXAMPLE_DIR)
        .filter(f => /^prompt_\d+\.json$/.test(f))
        .sort()
        .map(f => path.join(EXAMPLE_DIR, f));

    if (allPromptFiles.length === 0) {
        console.log('No pending prompts found in example/');
        process.exit(0);
    }

    // 分成多个 batch
    const batches = [];
    for (let i = 0; i < allPromptFiles.length; i += BATCH_SIZE) {
        batches.push(allPromptFiles.slice(i, i + BATCH_SIZE));
    }

    console.log(`Total prompts: ${allPromptFiles.length}, Batches: ${batches.length} (${BATCH_SIZE} per batch)`);
    console.log('');

    const confirm = await question('Ready to start multi-round? (Y/N) ');
    if (!confirm.toLowerCase().startsWith('y')) { console.log('Cancelled'); rl.close(); return; }

    const allTasks = [];  // 收集所有 batch 的任务信息用于最终导出
    let autoIdx = 1;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batchPrompts = batches[batchIdx];
        console.log('\n' + '#'.repeat(60));
        console.log(`  BATCH ${batchIdx + 1}/${batches.length} (${batchPrompts.length} tasks)`);
        console.log('#'.repeat(60));

        // 分配任务目录
        const tasks = [];
        for (const pf of batchPrompts) {
            while (true) {
                const folderName = `auto${autoIdx}`;
                const folderPath = path.join(TASKS_DIR, folderName);
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
                if (isFolderEmpty(folderPath)) {
                    tasks.push({ name: folderName, path: folderPath, promptFile: pf, handle: null, shuxianPos: null });
                    autoIdx++;
                    break;
                }
                autoIdx++;
            }
        }

        tasks.forEach((t, i) => console.log(`  ${i + 1}. ${path.basename(t.promptFile)} -> ${t.name}`));

        // 打开窗口
        console.log('\nOpening Trae windows...');
        for (const task of tasks) {
            try {
                platform.launchTraeWindow(TRAE_LAUNCH_TARGET, task.path);
            } catch (e) {}
        }
        console.log('Waiting 15s for windows to load...');
        await new Promise(r => setTimeout(r, 15000));

        console.log('Finding window handles...');
        const handleMap = {};
        const usedHandles = new Set();
        for (const task of tasks) {
            const handle = findWindowHandle(task.name);
            if (handle && !usedHandles.has(handle)) {
                handleMap[task.name] = handle;
                task.handle = handle;
                usedHandles.add(handle);
                console.log(`  ${task.name} -> handle ${handle}`);
            } else if (handle) {
                console.log(`  ${task.name} -> DUPLICATE HANDLE ${handle}, task disabled`);
            } else {
                console.log(`  ${task.name} -> NOT FOUND!`);
            }
        }

        // ===== 多轮循环 =====
        for (let round = 1; round <= ROUNDS; round++) {
            const roundStart = Date.now();
            console.log('\n' + '='.repeat(60));
            console.log(`  BATCH ${batchIdx + 1} | ROUND ${round}/${ROUNDS}`);
            console.log('='.repeat(60));

            // ---------- 步骤 1: 发送提示词 + 获取 SessionID ----------
            console.log(`\n[Round ${round}] Step 1: Sending prompts + getting SessionIDs...`);
            for (const task of tasks) {
                const handle = task.handle || handleMap[task.name];
                if (!handle) { console.log(`  SKIP ${task.name} - no handle`); continue; }

                console.log(`\n--- ${task.name} (Round ${round}) ---`);
                await new Promise(r => setTimeout(r, 3000));

                activateWindow(handle);
                const dragResult = runHelper('drag', ['--image', 'images/shuxian.png', '--direction', 'right', '--distance', '2000']);
                if (dragResult && dragResult.success) {
                    task.shuxianPos = dragResult.data;
                    console.log(`  Shuxian dragged from (${task.shuxianPos.x}, ${task.shuxianPos.y})`);
                } else {
                    console.log(`  Shuxian not found, skipping drag`);
                }

                let promptFile, promptText, promptObj;
                if (round === 1) {
                    promptFile = task.promptFile;
                } else {
                    promptFile = path.join(task.path, `prompt_${round}.json`);
                }

                try {
                    const jsonContent = fs.readFileSync(promptFile, 'utf8');
                    promptObj = JSON.parse(jsonContent);
                    promptText = promptObj['提示词内容'] || '';
                } catch (e) {
                    console.log(`  No prompt file for round ${round}, skipping`);
                    continue;
                }

                if (!promptText) { console.log('  Empty prompt, skipping'); continue; }

                if (round > 1) {
                    const jjResult = runHelper('click', ['--image', 'images/jujiao.png', '--clicks', '1']);
                    if (jjResult && jjResult.success) {
                        console.log(`  Clicked jujiao.png`);
                    } else {
                        console.log(`  jujiao.png not found, sending prompt anyway`);
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                const tempFile = path.join(os.tmpdir(), 'prompt_' + Date.now() + '.txt');
                fs.writeFileSync(tempFile, promptText, 'utf8');
                const ok = sendPrompt(handle, tempFile);
                console.log(ok ? `  Prompt sent OK` : `  Prompt send may have failed`);
                try { fs.unlinkSync(tempFile); } catch (e) {}

                if (round === 1) {
                    const dst = path.join(task.path, `prompt_1.json`);
                    try {
                        fs.copyFileSync(task.promptFile, dst);
                        console.log(`  Copied ${path.basename(task.promptFile)} -> ${task.name}/prompt_1.json`);
                    } catch (e) {
                        console.log(`  Failed to copy ${path.basename(task.promptFile)} -> ${task.name}/prompt_1.json`);
                    }
                }

                await new Promise(r => setTimeout(r, 300));
                activateWindow(handle);

                const sidArgs = ['--image', 'images/sessionid_button.png', '--wait', '0', '--max-attempts', '1', '--verify-timeout', '3'];
                if (task.shuxianPos) {
                    sidArgs.push('--fallback-x', String(task.shuxianPos.x - 20));
                    sidArgs.push('--fallback-y', String(task.shuxianPos.y));
                }

                const sidResult = runHelper('sessionid', sidArgs);
                let sessionData = null;
                if (sidResult && sidResult.success) {
                    sessionData = sidResult.data;
                    console.log(`  SessionID OK: ${sessionData.session_id || sessionData.full_id || 'OK'}`);
                } else {
                    console.log(`  SessionID failed: ${(sidResult && sidResult.error) || 'unknown'}`);
                }

                const resultData = loadResult(task.path, task.name);
                const roundData = {
                    round: round,
                    timestamp: new Date().toISOString(),
                    task_type: promptObj['任务类型'] || '',
                    business_domain: promptObj['业务领域'] || '',
                    modification_scope: promptObj['修改范围'] || '',
                    prompt: promptText,
                    session_id: sessionData || null,
                    trace: 'null',
                    '不满意原因': '',
                    github_url: '',
                    branch_folder: '',
                    commit_id: '',
                    status: sessionData ? 'ok' : '人工获取'
                };
                setRoundData(resultData, round, roundData);
                saveResult(task.path, task.name, resultData);

                if (task.shuxianPos) {
                    runHelper('scroll', [
                        '--scroll-x', String(task.shuxianPos.x - 20),
                        '--scroll-y', String(task.shuxianPos.y),
                        '--direction', 'down', '--distance', '10000'
                    ]);
                    console.log(`  Scrolled to bottom`);
                }
            }

            // ---------- 步骤 2-3: 等待 + 按钮检测 ----------
            console.log(`\n[Round ${round}] Step 2-3: Waiting ${WAIT_SECONDS}s + button detection...`);
            const waitStart = Date.now();
            const waitEnd = waitStart + WAIT_SECONDS * 1000;
            let nextHeartbeat = waitStart + 60000;
            const buttonImages = ['images/zhixing.png', 'images/next.jpg', 'images/delete.png', 'images/ok.png', 'images/tijiao.png', 'images/yunxing.png', 'images/renyao.png', 'images/quxiao.jpg'];
            const activeHandles = tasks.filter(t => t.handle).map(t => [t.name, t.handle]);

            while (Date.now() < waitEnd) {
                for (const [taskName, handle] of activeHandles) {
                    if (Date.now() >= waitEnd) break;
                    activateWindow(handle);
                    for (const img of buttonImages) {
                        const clickResult = runHelper('click', ['--image', img, '--clicks', '1']);
                        if (clickResult && clickResult.success) {
                            console.log(`  [${taskName}] Clicked ${path.basename(img)}`);
                        }
                    }
                    const switchEnd = Date.now() + SWITCH_INTERVAL * 1000;
                    while (Date.now() < Math.min(switchEnd, waitEnd)) {
                        await new Promise(r => setTimeout(r, 1000));
                        if (Date.now() >= nextHeartbeat) {
                            const remainingSeconds = Math.max(0, Math.ceil((waitEnd - Date.now()) / 1000));
                            const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
                            console.log(`  [Heartbeat] Round ${round} alive; ${remainingSeconds}s remaining; Node RSS ${memoryMb} MB`);
                            nextHeartbeat = Date.now() + 60000;
                        }
                    }
                }
                // 每遍历完一轮窗口后清理 Edge，防止内存持续增长
                platform.cleanupBrowserProcesses();
            }
            console.log(`  Wait complete (${fmtTime(Date.now() - waitStart)})`);

            // ---------- 步骤 4: stop 检测 ----------
            console.log(`\n[Round ${round}] Step 4: Stop detection...`);
            let isFirstStop = true;
            for (const [taskName, handle] of activeHandles) {
                activateWindow(handle);
                if (!isFirstStop) {
                    platform.clickLeftMiddle(PYTHON_EXE);
                    await new Promise(r => setTimeout(r, 500));
                }
                const stopResult = runHelper('click', ['--image', 'images/stop.png', '--clicks', '1']);
                if (stopResult && stopResult.success) {
                    console.log(`  [${taskName}] Clicked stop.png`);
                } else {
                    console.log(`  [${taskName}] stop.png not found`);
                }
                isFirstStop = false;
            }

            const tasksJson = JSON.stringify(tasks.map(t => ({ name: t.name, path: t.path })));

            // ---------- 步骤 6: 获取 trace ----------
            console.log(`\n[Round ${round}] Step 6: Getting traces...`);
            for (const task of tasks) {
                const handle = task.handle;
                if (!handle) continue;
                console.log(`  [${task.name}] Getting trace...`);
                const traceStart = Date.now();
                activateWindow(handle);

                const dragResult2 = runHelper('drag', ['--image', 'images/shuxian.png', '--direction', 'right', '--distance', '2000']);
                let sPos = task.shuxianPos;
                if (dragResult2 && dragResult2.success) sPos = dragResult2.data;

                if (sPos) {
                    runHelper('scroll', [
                        '--scroll-x', String(sPos.x - 20), '--scroll-y', String(sPos.y),
                        '--direction', 'down', '--distance', '10000'
                    ]);
                }

                let traceText = null;
                const traceEndTime = traceStart + TRACE_TIMEOUT * 1000;
                while (Date.now() < traceEndTime) {
                    const traceResult = runHelper('trace', [
                        '--image', 'images/finish.png',
                        '--all-image', 'images/finish_all.png',
                        '--clicks', '1', '--verify-timeout', '3',
                        '--max-wait', String(Math.max(1, Math.round((traceEndTime - Date.now()) / 1000)))
                    ]);
                    if (traceResult && traceResult.success) {
                        traceText = traceResult.data;
                        console.log(`  [${task.name}] Trace OK (${typeof traceText === 'string' ? traceText.length : 0} chars)`);
                        break;
                    }
                    await new Promise(r => setTimeout(r, 2000));
                }
                if (!traceText) console.log(`  [${task.name}] Trace failed`);

                const resultData = loadResult(task.path, task.name);
                const rd = getRoundData(resultData, round);
                if (rd) {
                    rd.trace = traceText || 'null';
                    if (!traceText || traceText === 'null') rd.status = '人工获取';
                    setRoundData(resultData, round, rd);
                    saveResult(task.path, task.name, resultData);
                }
                platform.cleanupBrowserProcesses();
            }

            // ---------- 步骤 7: 保留原始 trace + 生成不满意原因 ----------
            console.log(`\n[Round ${round}] Step 7: Generating dissatisfaction reasons...`);
            if (round === ROUNDS) {
                // 最后一轮：按 config.json 配置的概率判定满意
                let satisfiedCount = 0, unsatisfiedTasks = [];
                for (const task of tasks) {
                    const resultData = loadResult(task.path, task.name);
                    const rd = getRoundData(resultData, round);
                    if (!rd) continue;
                    if (Math.random() < FINAL_ROUND_SATISFACTION_PROBABILITY) {
                        rd.satisfied = true;
                        rd['任务是否完成'] = '完成了任务';
                        rd['产物及过程是否满意'] = '满意';
                        rd['不满意原因'] = '';
                        setRoundData(resultData, round, rd);
                        saveResult(task.path, task.name, resultData);
                        satisfiedCount++;
                    } else {
                        unsatisfiedTasks.push(task);
                    }
                }
                console.log(`  Last round: ${satisfiedCount} satisfied, ${unsatisfiedTasks.length} unsatisfied`);
                if (unsatisfiedTasks.length > 0) {
                    const unsatisfiedJson = JSON.stringify(unsatisfiedTasks.map(t => ({ name: t.name, path: t.path })));
                    const dissResult = runMultiRoundHelper('fill_dissatisfaction', [
                        '--tasks-json', unsatisfiedJson, '--round', String(round)
                    ]);
                    console.log(`  Filled: ${(dissResult && dissResult.data && dissResult.data.filled) || 0} tasks`);
                }
            } else {
                const dissResult = runMultiRoundHelper('fill_dissatisfaction', [
                    '--tasks-json', tasksJson, '--round', String(round)
                ]);
                console.log(`  Filled: ${(dissResult && dissResult.data && dissResult.data.filled) || 0} tasks`);
            }

            // ---------- 步骤 8: Git 上传 ----------
            console.log(`\n[Round ${round}] Step 8: Git upload after round completion...`);
            const gitResult = runMultiRoundHelper('git_upload', [
                '--tasks-json', tasksJson,
                '--round', String(round),
                '--repo', GIT_REPO, '--branch', GIT_BRANCH, '--prefix', FOLDER_PREFIX
            ]);
            const gitData = (gitResult && gitResult.data) || {};
            const uploadedCount = Array.isArray(gitData.results)
                ? gitData.results.length
                : (Array.isArray(gitResult && gitResult.data) ? gitResult.data.length : 0);
            const failedCount = Array.isArray(gitData.failures) ? gitData.failures.length : 0;
            if (gitResult && gitResult.success) {
                const suffix = failedCount ? `, ${failedCount} failed` : '';
                console.log(`  Git upload OK: ${uploadedCount} tasks${suffix}`);
            } else {
                const suffix = failedCount ? ` (${failedCount} task failures)` : '';
                console.log(`  Git upload failed: ${(gitResult && gitResult.error) || 'unknown'}${suffix}`);
            }
            if (failedCount) {
                console.log(`  Git failed tasks: ${gitData.failures.map(f => `${f.task_name}: ${f.error}`).join('; ')}`);
            }

            // ---------- 步骤 9: 生成下一轮提示词 ----------
            if (round < ROUNDS) {
                console.log(`\n[Round ${round}] Step 9: Generating prompts for round ${round + 1}...`);
                const genResult = runMultiRoundHelper('generate_next_prompt', [
                    '--tasks-json', tasksJson, '--round', String(round + 1)
                ]);
                console.log(`  Generated: ${(genResult && genResult.data && genResult.data.generated) || 0} prompts`);
                if (PROMPT_GEN_TIME > 0) {
                    console.log(`  Waiting ${PROMPT_GEN_TIME}s before next round...`);
                    await new Promise(r => setTimeout(r, PROMPT_GEN_TIME * 1000));
                }
            }

            console.log(`\n[Round ${round}] Complete in ${fmtTime(Date.now() - roundStart)}`);
            platform.cleanupBrowserProcesses();
            console.log(`  Edge browser cleaned up`);

            // 每轮导出 xlsx（增量）
            allTasks.length = 0;
            // 扫描 tasks 目录收集所有已处理的任务
            const allAutoFolders = fs.readdirSync(TASKS_DIR).filter(f => /^auto\d+$/.test(f)).sort((a, b) => {
                return parseInt(a.replace('auto', '')) - parseInt(b.replace('auto', ''));
            });
            for (const folder of allAutoFolders) {
                const fp = path.join(TASKS_DIR, folder);
                if (!isFolderEmpty(fp)) {
                    allTasks.push({ name: folder, path: fp });
                }
            }
            const roundTasksJson = JSON.stringify(allTasks);
            const roundExport = runMultiRoundHelper('export_xlsx', [
                '--tasks-json', roundTasksJson, '--rounds', String(ROUNDS)
            ]);
            if (roundExport && roundExport.success) {
                console.log(`  XLSX updated (${roundExport.data.rows} rows)`);
            }

            if (round === ROUNDS) {
                console.log(`\n[Round ${round}] Final cleanup: moving source prompts from example...`);
                const moveResult = moveInitialPromptsAfterFinalRound(tasks);
                console.log(`  Source prompts moved: ${moveResult.moved}, skipped: ${moveResult.skipped}`);
            }
        }

        // 关闭本批次窗口 + 深度资源清理
        console.log(`\nClosing batch ${batchIdx + 1} windows + deep cleanup...`);
        for (const task of tasks) {
            if (task.handle) closeWindow(task.handle);
        }
        platform.cleanupTraeProcesses(TRAE_APP_NAME);
        platform.cleanupBrowserProcesses();
        // 清理临时文件
        try {
            const tmpDir = os.tmpdir();
            const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith('trae_auto_') || f.startsWith('prompt_') || f.startsWith('tasks_json_'));
            for (const f of tmpFiles.slice(0, 200)) {
                try { fs.unlinkSync(path.join(tmpDir, f)); } catch (e) {}
            }
            console.log(`  Temp files cleaned (${tmpFiles.length})`);
        } catch (e) {}

        console.log(`Batch ${batchIdx + 1} complete. Waiting 10s before next batch...`);
        if (batchIdx < batches.length - 1) {
            await new Promise(r => setTimeout(r, 10000));
        }
    }

    // ===== 最终导出 xlsx =====
    console.log('\n' + '='.repeat(60));
    console.log('  FINAL EXPORT');
    console.log('='.repeat(60));

    const allAutoFolders = fs.readdirSync(TASKS_DIR).filter(f => /^auto\d+$/.test(f)).sort((a, b) => {
        return parseInt(a.replace('auto', '')) - parseInt(b.replace('auto', ''));
    });
    const finalTasks = [];
    for (const folder of allAutoFolders) {
        const fp = path.join(TASKS_DIR, folder);
        if (!isFolderEmpty(fp)) finalTasks.push({ name: folder, path: fp });
    }
    const finalJson = JSON.stringify(finalTasks);
    const exportResult = runMultiRoundHelper('export_xlsx', [
        '--tasks-json', finalJson, '--rounds', String(ROUNDS)
    ]);
    if (exportResult && exportResult.success) {
        console.log(`  Exported: ${exportResult.data.output} (${exportResult.data.rows} rows)`);
    } else {
        console.log(`  Export failed: ${(exportResult && exportResult.error) || 'unknown'}`);
    }

    console.log('\n==========================================');
    console.log('  ALL BATCHES & ROUNDS COMPLETE!');
    console.log('==========================================');
    runtimeLogger.finish('completed');
    question('Press Enter to exit...').then(() => rl.close());
}

main().catch(err => {
    console.error('ERROR:', err);
    runtimeLogger.finish('failed');
    rl.close();
    process.exit(1);
});
