const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOS = process.platform === 'darwin';
const MAC_TRAE_CANDIDATES = [
    '/usr/local/bin/trae-cn',
    '/opt/homebrew/bin/trae-cn',
    '/Applications/Trae CN.app',
    '/Applications/Trae.app',
    'trae-cn',
    'trae',
];

function runTempScript(ext, source, command, preArgs = [], scriptArgs = [], options = {}) {
    const tmpFile = path.join(
        os.tmpdir(),
        `trae_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    );
    fs.writeFileSync(tmpFile, source, 'utf8');
    try {
        return execFileSync(command, [...preArgs, tmpFile, ...scriptArgs], {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: options.timeout || 120000,
            input: options.input,
        });
    } catch (error) {
        return error.stdout ? error.stdout.toString() : '';
    } finally {
        try { fs.unlinkSync(tmpFile); } catch (error) {}
    }
}

function runPowerShell(script, options = {}) {
    if (!IS_WINDOWS) return '';
    return runTempScript('ps1', script, 'powershell', ['-ExecutionPolicy', 'Bypass', '-File'], [], options);
}

function runAppleScript(script, args = [], options = {}) {
    if (!IS_MACOS) return '';
    return runTempScript('applescript', script, 'osascript', [], args, options);
}

function writeMacClipboard(text) {
    execFileSync('pbcopy', {
        input: text,
        encoding: 'utf8',
        stdio: ['pipe', 'ignore', 'pipe'],
        timeout: 10000,
    });
}

function normalizeAppName(traeExecutable, configuredName) {
    if (configuredName && String(configuredName).trim()) {
        return String(configuredName).trim();
    }
    if (traeExecutable && String(traeExecutable).endsWith('.app')) {
        return path.basename(String(traeExecutable), '.app');
    }
    if (traeExecutable && String(traeExecutable).toLowerCase().includes('trae')) {
        return 'Trae CN';
    }
    return 'Trae CN';
}

function expandHome(value) {
    const text = String(value || '');
    if (text === '~') return os.homedir();
    if (text.startsWith('~/') || text.startsWith('~\\')) {
        return path.join(os.homedir(), text.slice(2));
    }
    return text;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function windowTitleMatchesTarget(title, targetName) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(targetName)}([^A-Za-z0-9_]|$)`, 'i');
    return pattern.test(title);
}

function isCommandName(value) {
    const text = String(value || '');
    return text && !text.includes('/') && !text.includes('\\') && !text.startsWith('.');
}

function firstExistingMacTraeTarget(traeExecutable) {
    const configured = expandHome(traeExecutable || '');
    const candidates = [];
    if (configured) candidates.push(configured);
    candidates.push(...MAC_TRAE_CANDIDATES);

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (isCommandName(candidate)) return candidate;
        if (fs.existsSync(candidate)) return candidate;
    }

    return configured || MAC_TRAE_CANDIDATES[0];
}

function macAppMatchesSnippet() {
    return `
on appMatches(processName, appName)
    if appName is "" then return processName contains "Trae"
    return processName is appName or processName contains appName or appName contains processName
end appMatches
`.trim();
}

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

function findWindowsWindow(targetName) {
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
        if ($title -match $script:tName) { $script:found.Add($hWnd) | Out-Null }
    }
    return $true
}
[Win32]::EnumWindows($enumProc, [IntPtr]::Zero) | Out-Null
if ($script:found.Count -gt 0) { Write-Host "HANDLE:$($script:found[0])" } else { Write-Host "HANDLE:NOT_FOUND" }
`.trim();
    const output = runPowerShell(script);
    const match = output.match(/HANDLE:(\d+)/);
    return match ? match[1] : null;
}

function findMacWindow(targetName, appName) {
    const output = listMacWindows(appName);
    const lines = output.trim().split(/\r?\n/).filter(line => line.trim());
    for (const line of lines) {
        const match = line.match(/TITLE:(.*)$/);
        const title = match ? match[1].trim() : line.trim();
        if (windowTitleMatchesTarget(title, targetName)) return title;
    }
    return null;
}

function findWindowHandle(targetName, options = {}) {
    if (IS_MACOS) return findMacWindow(targetName, options.traeAppName || 'Trae CN');
    return findWindowsWindow(targetName);
}

function activateWindowsWindow(handleStr) {
    const script = `
${ADD_TYPE_BLOCK}
$hWnd = [IntPtr]::new(${handleStr})
[Win32]::SetWindowPos($hWnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
Start-Sleep -Milliseconds 150
[Win32]::ShowWindow($hWnd, [Win32]::SW_MAXIMIZE) | Out-Null
Start-Sleep -Milliseconds 200
[Win32]::BringWindowToTop($hWnd) | Out-Null
Start-Sleep -Milliseconds 150
[Win32]::SetForegroundWindow($hWnd) | Out-Null
Start-Sleep -Milliseconds 400
$fg = [Win32]::GetForegroundWindow()
if ($fg -ne $hWnd) { [Win32]::SetForegroundWindow($hWnd) | Out-Null; Start-Sleep -Milliseconds 500 }
[Win32]::SetWindowPos($hWnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
Write-Host "ACTIVATED"
`.trim();
    const output = runPowerShell(script);
    return output.includes('ACTIVATED');
}

function activateMacWindow(targetName, appName) {
    const script = `
${macAppMatchesSnippet()}

on run argv
    set targetName to item 1 of argv
    set appName to item 2 of argv
    tell application "System Events"
        repeat with proc in application processes
            set processName to name of proc as text
            if appMatches(processName, appName) then
                repeat with win in windows of proc
                    try
                        set windowName to name of win as text
                        if windowName is targetName then
                            set frontmost of proc to true
                            perform action "AXRaise" of win
                            delay 0.4
                            return "ACTIVATED"
                        end if
                    end try
                end repeat
            end if
        end repeat
    end tell
    return "NOT_FOUND"
end run
`.trim();
    const output = runAppleScript(script, [targetName, appName]);
    return output.includes('ACTIVATED');
}

function activateWindow(handleStr, options = {}) {
    if (IS_MACOS) return activateMacWindow(handleStr, options.traeAppName || 'Trae CN');
    return activateWindowsWindow(handleStr);
}

function closeWindowsWindow(handleStr) {
    const script = `
${ADD_TYPE_BLOCK}
$hWnd = [IntPtr]::new(${handleStr})
[Win32]::PostMessage($hWnd, [Win32]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
Start-Sleep -Milliseconds 500
Get-Process | Where-Object { $_.MainWindowHandle -eq $hWnd } | Stop-Process -Force
Start-Sleep -Milliseconds 500
Write-Host "CLOSED"
`.trim();
    runPowerShell(script);
}

function closeMacWindow(targetName, appName) {
    const activated = activateMacWindow(targetName, appName);
    if (!activated) return false;
    const script = `
on run
    tell application "System Events"
        key code 13 using {command down}
    end tell
    delay 0.5
    return "CLOSED"
end run
`.trim();
    const output = runAppleScript(script);
    return output.includes('CLOSED');
}

function closeWindow(handleStr, options = {}) {
    if (IS_MACOS) return closeMacWindow(handleStr, options.traeAppName || 'Trae CN');
    return closeWindowsWindow(handleStr);
}

function sendWindowsPrompt(handleStr, tempPromptFile) {
    const script = `
${ADD_TYPE_BLOCK}
$hWnd = [IntPtr]::new(${handleStr})
$promptFile = "${tempPromptFile}"
$focusOk = $false
for ($attempt = 1; $attempt -le 5; $attempt++) {
    [Win32]::SetWindowPos($hWnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
    Start-Sleep -Milliseconds 500
    [Win32]::ShowWindow($hWnd, [Win32]::SW_MAXIMIZE) | Out-Null
    Start-Sleep -Milliseconds 500
    [Win32]::BringWindowToTop($hWnd) | Out-Null
    Start-Sleep -Milliseconds 500
    [Win32]::SetForegroundWindow($hWnd) | Out-Null
    Start-Sleep -Milliseconds (1500 + $attempt * 500)
    $fg = [Win32]::GetForegroundWindow()
    if ($fg -eq $hWnd) { $focusOk = $true; break }
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
if (-not $clipCheck) { Set-Clipboard -Value $promptText; Start-Sleep -Milliseconds 800 }
Start-Sleep -Milliseconds 500
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_V, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_V, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 3000
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_RETURN, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_RETURN, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150
[Win32]::keybd_event([Win32]::VK_CONTROL, 0, [Win32]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 1000
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
    const output = runPowerShell(script);
    return output.includes('DONE') && !output.includes('FOCUS_FAILED');
}

function sendMacPrompt(targetName, tempPromptFile, appName) {
    const promptText = fs.readFileSync(tempPromptFile, 'utf8');
    writeMacClipboard(promptText);
    const activated = activateMacWindow(targetName, appName);
    if (!activated) return false;

    const script = `
on run
    tell application "System Events"
        keystroke "v" using {command down}
        delay 3
        key code 36 using {command down}
        delay 1
        key code 36
        delay 0.3
        key code 36
    end tell
    delay 0.5
    return "DONE"
end run
`.trim();
    const output = runAppleScript(script);
    return output.includes('DONE');
}

function sendPrompt(handleStr, tempPromptFile, options = {}) {
    if (IS_MACOS) return sendMacPrompt(handleStr, tempPromptFile, options.traeAppName || 'Trae CN');
    return sendWindowsPrompt(handleStr, tempPromptFile);
}

function launchTraeWindow(traeExecutable, taskPath) {
    if (IS_MACOS) {
        const target = firstExistingMacTraeTarget(traeExecutable);
        const appName = normalizeAppName(target, '');
        const args = ['-n', taskPath];
        const options = {
            stdio: 'ignore',
            timeout: 15000,
        };

        if (String(target).endsWith('.app')) {
            execFileSync('open', ['-n', target, '--args', ...args], options);
        } else if (isCommandName(target)) {
            try {
                execFileSync(target, args, options);
            } catch (error) {
                execFileSync('open', ['-na', appName, '--args', ...args], options);
            }
        } else {
            execFileSync(target, args, options);
        }
        return;
    }

    const target = expandHome(traeExecutable);
    execSync(`"${target}" -n "${taskPath}"`, { stdio: 'ignore', timeout: 10000 });
}

function killWindowsImage(imageName, timeout = 5000) {
    try { execSync(`taskkill /F /IM ${imageName}`, { stdio: 'ignore', timeout }); } catch (error) {}
}

function pkillPattern(pattern, timeout = 5000) {
    try { execFileSync('pkill', ['-f', pattern], { stdio: 'ignore', timeout }); } catch (error) {}
}

function cleanupBrowserProcesses() {
    if (IS_MACOS) {
        pkillPattern('Microsoft Edge');
        pkillPattern('msedge');
        return;
    }
    killWindowsImage('msedge.exe');
}

function cleanupTraeProcesses(appName = 'Trae CN') {
    if (IS_MACOS) {
        pkillPattern(appName, 10000);
        if (appName !== 'Trae') pkillPattern('Trae', 10000);
        return;
    }
    killWindowsImage('trae-cn.exe', 10000);
}

function clickLeftMiddle(pythonExecutable) {
    const code = 'import pyautogui; h=pyautogui.size()[1]; pyautogui.click(10, h//2)';
    try {
        execFileSync(pythonExecutable, ['-c', code], {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch (error) {}
}

function listMacWindows(appName) {
    const script = `
${macAppMatchesSnippet()}

on joinLines(itemsList)
    set AppleScript's text item delimiters to linefeed
    set joinedText to itemsList as text
    set AppleScript's text item delimiters to ""
    return joinedText
end joinLines

on run argv
    set appName to item 1 of argv
    set outputLines to {}
    tell application "System Events"
        repeat with proc in application processes
            set processName to name of proc as text
            if appMatches(processName, appName) then
                repeat with win in windows of proc
                    try
                        set windowName to name of win as text
                        if windowName is not "" then
                            set end of outputLines to "PROCESS:" & processName & " | TITLE:" & windowName
                        end if
                    end try
                end repeat
            end if
        end repeat
    end tell
    return joinLines(outputLines)
end run
`.trim();
    return runAppleScript(script, [appName], { timeout: 30000 });
}

function listWindows(options = {}) {
    if (IS_MACOS) {
        const appName = options.traeAppName || 'Trae CN';
        return listMacWindows(appName);
    }

    const script = `
${ADD_TYPE_BLOCK}
$script:results = [System.Collections.ArrayList]::new()
$enumProc = [Win32+EnumWindowsProc]{
    param($hWnd, $lParam)
    if ([Win32]::IsWindowVisible($hWnd)) {
        $tb = New-Object System.Text.StringBuilder(256)
        [Win32]::GetWindowText($hWnd, $tb, $tb.Capacity) | Out-Null
        $title = $tb.ToString()
        if ($title -ne "") { $script:results.Add("HANDLE:$($hWnd) | TITLE:$($title)") | Out-Null }
    }
    return $true
}
[Win32]::EnumWindows($enumProc, [IntPtr]::Zero) | Out-Null
foreach ($r in $script:results) { Write-Host $r }
`.trim();
    return runPowerShell(script, { timeout: 30000 });
}

module.exports = {
    IS_MACOS,
    IS_WINDOWS,
    activateWindow,
    cleanupBrowserProcesses,
    cleanupTraeProcesses,
    clickLeftMiddle,
    closeWindow,
    findWindowHandle,
    launchTraeWindow,
    listWindows,
    expandHome,
    firstExistingMacTraeTarget,
    normalizeAppName,
    sendPrompt,
};
