const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const os = require('os');
const APP_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function configValue(section, key, fallback) {
    return APP_CONFIG[section] && APP_CONFIG[section][key] !== undefined
        ? APP_CONFIG[section][key]
        : fallback;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

function fmtTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
}

// ============================================================
// CONFIG - modify these values as needed
// ============================================================

const TRAE_EXE = configValue('paths', 'trae_executable', '');
const BATCH_SIZE = configValue('automation', 'batch_size', 8);
const CLEANUP_EVERY_N = configValue('automation', 'cleanup_every_batches', 3);
const WAIT_SECONDS = configValue('automation', 'single_round_wait_seconds', 500);
// 重要：必须指向你 conda 环境里的 python.exe 绝对路径，否则 Windows 可能弹出"选择应用打开"对话框
// 示例："F:\\anaconda\\envs\\project\\python.exe"
const PYTHON_EXE = configValue('paths', 'python_executable', 'python');
// ============================================================

const BASE_DIR = __dirname;
const EXAMPLE_DIR = path.resolve(__dirname, configValue('paths', 'example_directory', 'example'));

const ADD_TYPE_BLOCK = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern IntPtr PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public const int KEYEVENTF_KEYUP = 0x0002;
    public const int VK_CONTROL = 0x11;
    public const int VK_MENU = 0x12;
    public const int VK_V = 0x56;
    public const int VK_RETURN = 0x0D;
    public const int VK_U = 0x55;
    public const int VK_TAB = 0x09;
    public const int VK_OEM_5 = 0xDC;
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SW_MAXIMIZE = 3;
    public const uint WM_CLOSE = 0x0010;
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@
`.trim();

function runPS(script) {
    const tmpFile = path.join(os.tmpdir(), 'trae_auto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.ps1');
    fs.writeFileSync(tmpFile, script, 'utf8');
    let output = '';
    try {
        output = execSync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000
        });
    } catch (e) {
        output = e.stdout || '';
    }
    try { fs.unlinkSync(tmpFile); } catch (e) {}
    return output;
}

function findWindowHandle(targetName) {
    const script = `
${ADD_TYPE_BLOCK}

$script:tName = "\\b${targetName}\\b"
$script:found = [System.Collections.ArrayList]::new()

$enumProc = [Win32+EnumWindowsProc]{
    param($hWnd, $lParam)
    if ([Win32]::IsWindowVisible($hWnd)) {
        $tb = New-Object System.Text.StringBuilder(256)
        [Win32]::GetWindowText($hWnd, $tb, $tb.Capacity) | Out-Null
        $title = $tb.ToString()
        if ($title -match $script:tName) {
            $script:found.Add($hWnd) | Out-Null
        }
    }
    return $true
}
[Win32]::EnumWindows($enumProc, [IntPtr]::Zero) | Out-Null

if ($script:found.Count -gt 0) {
    Write-Host "HANDLE:$($script:found[0])"
} else {
    Write-Host "HANDLE:NOT_FOUND"
}
`.trim();
    const output = runPS(script);
    const match = output.match(/HANDLE:(\d+)/);
    return match ? match[1] : null;
}

function activateWindow(handleStr) {
    const script = `
${ADD_TYPE_BLOCK}

$hWnd = [IntPtr]::new(${handleStr})
[Win32]::SetWindowPos($hWnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
Start-Sleep -Milliseconds 300
[Win32]::ShowWindow($hWnd, [Win32]::SW_MAXIMIZE) | Out-Null
Start-Sleep -Milliseconds 500
[Win32]::BringWindowToTop($hWnd) | Out-Null
Start-Sleep -Milliseconds 300
[Win32]::SetForegroundWindow($hWnd) | Out-Null
Start-Sleep -Milliseconds 800

$fg = [Win32]::GetForegroundWindow()
if ($fg -ne $hWnd) {
    [Win32]::SetForegroundWindow($hWnd) | Out-Null
    Start-Sleep -Milliseconds 1000
}
Write-Host "ACTIVATED"
`.trim();
    const output = runPS(script);
    return output.includes('ACTIVATED');
}

function closeWindow(handleStr) {
    const script = `
${ADD_TYPE_BLOCK}

$hWnd = [IntPtr]::new(${handleStr})
[Win32]::PostMessage($hWnd, [Win32]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
Start-Sleep -Milliseconds 500
Get-Process | Where-Object { $_.MainWindowHandle -eq $hWnd } | Stop-Process -Force
Start-Sleep -Milliseconds 500
Write-Host "CLOSED"
`.trim();
    runPS(script);
}

// 调用 Python 辅助脚本（trae_helper.py）进行图像识别 + 剪贴板读取
function runHelper(action, extraArgs = []) {
    const helperPath = path.join(__dirname, 'trae_helper.py');
    const args = [PYTHON_EXE, helperPath, '--action', action, ...extraArgs];
    const cmd = args.map(a => `"${a}"`).join(' ');
    let output = '';
    try {
        output = execSync(cmd, {
            encoding: 'utf8',
            timeout: action === 'trace' ? 20000 : 120000,
            stdio: ['pipe', 'pipe', 'pipe'],
            maxBuffer: 10 * 1024 * 1024,
            shell: true
        });
    } catch (e) {
        output = e.stdout || '';
    }
    const lines = output.trim().split(/\r?\n/).filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if ((line.startsWith('{') && line.endsWith('}')) || (line.startsWith('[') && line.endsWith(']'))) {
            try {
                return JSON.parse(line);
            } catch (e) {
                continue;
            }
        }
    }
    return { success: false, error: "No valid JSON output from helper" };
}

// 保存任务结果到对应 auto 目录
function saveTaskResult(task) {
    const result = {
        timestamp: new Date().toISOString(),
        task_name: task.name,
        task_type: task.metadata?.taskType || '',
        business_domain: task.metadata?.businessDomain || '',
        modification_scope: task.metadata?.modificationScope || '',
        prompt: task.metadata?.prompt || '',
        session_id: task.sessionId || null,
        trace: task.trace || "null"
    };
    const filepath = path.join(task.path, `result_${task.name}.json`);
    try {
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf8');
        console.log(`  Result saved: ${filepath}`);
    } catch (e) {
        console.log(`  Save result failed: ${e.message}`);
    }
}

// All batches: just Paste -> Enter
function sendPrompt(handleStr, tempPromptFile) {
    const script = `
${ADD_TYPE_BLOCK}

$hWnd = [IntPtr]::new(${handleStr})
$promptFile = "${tempPromptFile}"

# ---------- Robust focus acquisition (up to 5 attempts) ----------
$focusOk = $false
for ($attempt = 1; $attempt -le 5; $attempt++) {
    [Win32]::SetWindowPos($hWnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
    Start-Sleep -Milliseconds 500
    [Win32]::ShowWindow($hWnd, [Win32]::SW_MAXIMIZE) | Out-Null
    Start-Sleep -Milliseconds 500
    [Win32]::BringWindowToTop($hWnd) | Out-Null
    Start-Sleep -Milliseconds 500
    [Win32]::SetForegroundWindow($hWnd) | Out-Null
    Start-Sleep -Milliseconds (1500 + $attempt * 500)  # increasing wait: 2s, 2.5s, 3s...

    $fg = [Win32]::GetForegroundWindow()
    if ($fg -eq $hWnd) {
        $focusOk = $true
        Write-Host "FOCUS_OK_ATTEMPT_$attempt"
        break
    }

    # Alt key trick to force window activation
    [Win32]::keybd_event([Win32]::VK_MENU, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 100
    [Win32]::keybd_event([Win32]::VK_MENU, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 1000
}

if (-not $focusOk) {
    Write-Host "FOCUS_FAILED"
    [Win32]::SetWindowPos($hWnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
    exit
}

$promptText = Get-Content -Path $promptFile -Raw -Encoding UTF8
Set-Clipboard -Value $promptText
Start-Sleep -Milliseconds 800
$clipCheck = Get-Clipboard
if (-not $clipCheck) {
    Write-Host "CLIPBOARD_EMPTY_RETRY"
    Set-Clipboard -Value $promptText
    Start-Sleep -Milliseconds 800
    $clipCheck = Get-Clipboard
    if (-not $clipCheck) {
        Write-Host "CLIPBOARD_FAILED"
        [Win32]::SetWindowPos($hWnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
        exit
    }
} else {
    Write-Host "CLIPBOARD_OK"
}
Start-Sleep -Milliseconds 500

Write-Host "Paste..."
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_V, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_V, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 3000

Write-Host "Ctrl+Enter..."
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_RETURN, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_RETURN, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 1000

Write-Host "Enter..."
[Win32]::keybd_event([Win32]::VK_RETURN, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 300
[Win32]::keybd_event([Win32]::VK_RETURN, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 1000
[Win32]::keybd_event([Win32]::VK_RETURN, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 300
[Win32]::keybd_event([Win32]::VK_RETURN, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)

Start-Sleep -Milliseconds 500
[Win32]::SetWindowPos($hWnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null

Write-Host "DONE"
`.trim();
    const output = runPS(script);
    return output.includes('DONE') && !output.includes('FOCUS_FAILED') && !output.includes('CLIPBOARD_FAILED');
}

function isFolderEmpty(folderPath) {
    if (!fs.existsSync(folderPath)) return true;
    const files = fs.readdirSync(folderPath);
    return files.length === 0;
}

async function main() {
    console.log('=====================================');
    console.log('  TRAE AUTO SEND + COLLECT');
    console.log('=====================================');
    console.log('');

    const promptFiles = fs.readdirSync(EXAMPLE_DIR)
        .filter(f => f.endsWith('.json') && !f.endsWith('_down.json') && !f.startsWith('result_'))
        .sort()
        .map(f => path.join(EXAMPLE_DIR, f));

    if (promptFiles.length === 0) {
        console.log('No pending prompts found.');
        process.exit(0);
    }

    const tasks = [];
    let autoIdx = 1;
    for (const pf of promptFiles) {
        while (true) {
            const folderName = `auto${autoIdx}`;
            const folderPath = path.join(BASE_DIR, 'tasks', folderName);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            if (isFolderEmpty(folderPath)) {
                tasks.push({ name: folderName, path: folderPath, promptFile: pf, metadata: null, sessionId: null, trace: null });
                autoIdx++;
                break;
            }
            autoIdx++;
        }
    }

    console.log(`Found ${tasks.length} pending prompts:`);
    tasks.forEach((t, i) => {
        console.log(`  ${i + 1}. ${path.basename(t.promptFile)} -> ${t.name}`);
    });
    console.log('');

    const confirm = await question('Ready to start? (Y/N) ');
    if (!confirm.toLowerCase().startsWith('y')) {
        console.log('Cancelled');
        rl.close();
        return;
    }

    const batches = [];
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        batches.push(tasks.slice(i, i + BATCH_SIZE));
    }

    for (let b = 0; b < batches.length; b++) {
        const batchStart = Date.now();
        const batch = batches[b];
        console.log('');
        console.log('=====================================');
        console.log(`  BATCH ${b + 1}/${batches.length} (Direct Paste)`);
        batch.forEach(t => console.log(`  ${t.name}: ${path.basename(t.promptFile)}`));
        console.log('=====================================');

        const t1 = Date.now();
        console.log('Opening Trae windows...');
        for (const task of batch) {
            try {
                console.log(`  Opening: ${task.name} ...`);
                execSync(`"${TRAE_EXE}" -n "${task.path}"`, { stdio: 'ignore', timeout: 10000 });
            } catch (e) {
                console.log(`  Warning: ${e.message}`);
            }
        }
        console.log(`  [Timer] Open windows took ${fmtTime(Date.now() - t1)}`);

        const t2 = Date.now();
        console.log('Waiting 15 seconds for windows to fully load...');
        for (let i = 15; i > 0; i--) {
            console.log(`  ${i}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`  [Timer] Window load wait took ${fmtTime(Date.now() - t2)}`);

        const t3 = Date.now();
        console.log('Finding window handles...');
        const handleMap = {};
        for (const task of batch) {
            const handle = findWindowHandle(task.name);
            if (handle) {
                handleMap[task.name] = handle;
                console.log(`  ${task.name} -> handle ${handle}`);
            } else {
                console.log(`  ${task.name} -> NOT FOUND!`);
            }
        }

        if (Object.keys(handleMap).length === 0) {
            console.log('ERROR: No windows found in this batch!');
            continue;
        }

        // ---------- 拖拽分割线 + 发送提示词 + 获取 SessionID ----------
        const t4 = Date.now();
        for (const task of batch) {
            const taskStart = Date.now();
            const handle = handleMap[task.name];
            if (!handle) {
                console.log(`  SKIP ${task.name} - window not found`);
                continue;
            }

            console.log('');
            console.log(`--- Processing ${task.name} ---`);
            console.log(`  Waiting 3s for window to be ready...`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 1: 拖拽分割线（扩大对话区）
            let shuxianPos = null;
            activateWindow(handle);
            const dragResult = runHelper('drag', [
                '--image', 'images/shuxian.png',
                '--direction', 'right',
                '--distance', '9999'
            ]);
            if (dragResult && dragResult.success) {
                shuxianPos = dragResult.data;
                console.log(`  [${task.name}] Shuxian dragged from (${shuxianPos.x}, ${shuxianPos.y})`);
            } else {
                console.log(`  [${task.name}] Shuxian not found, skipping drag`);
            }

            // Step 2: 发送提示词
            try {
                const jsonContent = fs.readFileSync(task.promptFile, 'utf8');
                const promptObj = JSON.parse(jsonContent);
                const promptText = promptObj['提示词内容'] || '';

                task.metadata = {
                    taskType: promptObj['任务类型'] || '',
                    businessDomain: promptObj['业务领域'] || '',
                    modificationScope: promptObj['修改范围'] || '',
                    prompt: promptText
                };

                if (!promptText) {
                    console.log('  No prompt content, skipping');
                    continue;
                }

                const tempPromptFile = path.join(os.tmpdir(), 'prompt_' + Date.now() + '.txt');
                fs.writeFileSync(tempPromptFile, promptText, 'utf8');

                const tSend = Date.now();
                const ok = sendPrompt(handle, tempPromptFile);
                console.log(`  [Timer] sendPrompt took ${fmtTime(Date.now() - tSend)}`);
                console.log(ok ? `  [${task.name}] Prompt sent OK` : `  [${task.name}] Prompt send may have failed`);

                try { fs.unlinkSync(tempPromptFile); } catch (e) {}
            } catch (e) {
                console.log('  ERROR:', e.message);
                continue;
            }

            // Step 3: 等 1s 后快速获取 SessionID
            await new Promise(resolve => setTimeout(resolve, 1000));
            const tSid = Date.now();
            console.log(`  [${task.name}] Getting session id (fast mode)...`);
            activateWindow(handle);

            const sidArgs = [
                '--image', 'images/sessionid_button.png',
                '--wait', '0',
                '--max-attempts', '1',
                '--verify-timeout', '3'
            ];
            if (shuxianPos) {
                sidArgs.push('--fallback-x', String(shuxianPos.x - 20));
                sidArgs.push('--fallback-y', String(shuxianPos.y));
            }

            const sidResult = runHelper('sessionid', sidArgs);

            if (sidResult && sidResult.success) {
                task.sessionId = sidResult.data;
                const sidDisplay = sidResult.data.session_id || sidResult.data.full_id || 'OK';
                console.log(`  [${task.name}] SessionID OK: ${sidDisplay}`);
            } else {
                console.log(`  [${task.name}] SessionID failed: ${(sidResult && sidResult.error) || 'unknown error'}`);
            }
            console.log(`  [Timer] SessionID fetch took ${fmtTime(Date.now() - tSid)}`);

            task.trace = "null";
            saveTaskResult(task);
            console.log(`  [Timer] Total ${task.name} took ${fmtTime(Date.now() - taskStart)}`);
        }
        console.log(`  [Timer] All prompts send took ${fmtTime(Date.now() - t4)}`);

        // ---------- 等待 AI 响应 + zhixing 检测 ----------
        console.log('');
        const t5 = Date.now();
        const waitMin = Math.round(WAIT_SECONDS / 60);
        console.log(`All prompts sent in this batch. Waiting ${waitMin} minutes (${WAIT_SECONDS}s) for AI responses...`);

        const handleList = Object.entries(handleMap);
        const endTime = Date.now() + WAIT_SECONDS * 1000;

        // 倒计时显示
        let remaining = WAIT_SECONDS;
        const countdownTimer = setInterval(() => {
            remaining--;
            if (remaining % 10 === 0 || remaining <= 5) {
                process.stdout.write(`\r  Remaining: ${remaining}s `);
            }
            if (remaining <= 0) {
                clearInterval(countdownTimer);
            }
        }, 1000);

        // zhixing 检测循环
        try {
        if (handleList.length > 0) {
            while (Date.now() < endTime) {
                // 等待 30 秒进入下一轮，或等待到结束
                const nextScanTime = Date.now() + 30000;
                while (Date.now() < Math.min(nextScanTime, endTime)) {
                    await new Promise(r => setTimeout(r, 1000));
                }
                if (Date.now() >= endTime) break;

                console.log(`\n[Zhixing Check] Scanning ${handleList.length} windows...`);
                for (const [taskName, handle] of handleList) {
                    if (Date.now() >= endTime) {
                        console.log('  [Zhixing Check] Time is up, stopping scan');
                        break;
                    }

                    console.log(`  [${taskName}] Checking zhixing.png...`);
                    activateWindow(handle);

                    const clickResult = runHelper('click', ['--image', 'images/zhixing.png', '--clicks', '1', '--wait', '2']);
                    if (clickResult.success) {
                        console.log(`  [${taskName}] Clicked zhixing.png`);
                    } else {
                        console.log(`  [${taskName}] zhixing.png not found`);
                    }

                    // 每个窗口停留 5 秒
                    const dwellEnd = Date.now() + 5000;
                    while (Date.now() < Math.min(dwellEnd, endTime)) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                    if (Date.now() >= endTime) break;
                }
            }
        } else {
            // 没有窗口，纯等待
            while (Date.now() < endTime) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        } finally {
            clearInterval(countdownTimer);
        }
        console.log(`  [Timer] AI wait + zhixing check took ${fmtTime(Date.now() - t5)}`);
        console.log('');

        // ---------- 关闭 Edge + Trae 窗口 + 移动文件 ----------
        const t6 = Date.now();
        console.log('');
        console.log('Closing browsers and Trae windows, moving files...');

        // 关闭 Edge 浏览器
        try {
            execSync('taskkill /F /IM msedge.exe', { stdio: 'ignore', timeout: 10000 });
            console.log('  Edge closed');
        } catch (e) {
            // Edge may not be running
        }

        for (const task of batch) {
            const handle = handleMap[task.name];
            if (!handle) {
                console.log(`  SKIP ${task.name} - window not found`);
                continue;
            }

            closeWindow(handle);
            console.log(`  [${task.name}] Trae window closed`);

            const src = task.promptFile;
            const dst = path.join(task.path, path.basename(src));
            try {
                if (fs.existsSync(src)) {
                    fs.renameSync(src, dst);
                    console.log(`  [${task.name}] Moved prompt file -> ${task.name}/`);
                }
            } catch (e) {
                console.log(`  [${task.name}] Move failed: ${e.message}`);
            }
        }
        console.log(`  [Timer] Close + move took ${fmtTime(Date.now() - t6)}`);

        // 每轮结束后强制清理 Trae 残留进程，防止剪贴板/句柄污染影响下一轮
        const t7 = Date.now();
        console.log('Force killing all trae-cn processes...');
        try {
            execSync('taskkill /F /IM trae-cn.exe', { stdio: 'ignore', timeout: 10000 });
            console.log('  All trae-cn processes killed');
        } catch (e) {}

        if (b < batches.length - 1) {
            const batchNum = b + 1;
            if (batchNum % CLEANUP_EVERY_N === 0) {
                console.log(`\n=== Deep cleanup after ${batchNum} batches ===`);
                try {
                    execSync('taskkill /F /IM msedge.exe', { stdio: 'ignore', timeout: 10000 });
                    console.log('  Edge killed');
                } catch (e) {}
                try {
                    execSync('taskkill /F /IM trae-cn.exe', { stdio: 'ignore', timeout: 10000 });
                    console.log('  Trae killed');
                } catch (e) {}
                try {
                    const tmpDir = os.tmpdir();
                    const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith('trae_auto_') || f.startsWith('prompt_'));
                    for (const f of tmpFiles.slice(0, 100)) {
                        try { fs.unlinkSync(path.join(tmpDir, f)); } catch (e) {}
                    }
                    console.log(`  Temp files cleaned (${tmpFiles.length})`);
                } catch (e) {}
                console.log('Waiting 10 seconds for system recovery...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.log('Waiting 10 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            console.log(`  [Timer] Inter-batch wait/cleanup took ${fmtTime(Date.now() - t7)}`);
        }
        console.log(`  [Timer] BATCH ${b + 1} total took ${fmtTime(Date.now() - batchStart)}`);
    }

    console.log('');
    console.log('=====================================');
    console.log('  ALL PROMPTS SENT AND RESULTS COLLECTED!');
    console.log('=====================================');
    question('Press Enter to exit...').then(() => rl.close());
}

main().catch(err => {
    console.error('ERROR:', err);
    rl.close();
    process.exit(1);
});
