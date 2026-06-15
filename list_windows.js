const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const script = `
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
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@

$script:results = [System.Collections.ArrayList]::new()

$enumProc = [Win32+EnumWindowsProc]{
    param($hWnd, $lParam)
    if ([Win32]::IsWindowVisible($hWnd)) {
        $tb = New-Object System.Text.StringBuilder(256)
        [Win32]::GetWindowText($hWnd, $tb, $tb.Capacity) | Out-Null
        $title = $tb.ToString()
        if ($title -ne "") {
            $script:results.Add("HANDLE:$($hWnd) | TITLE:$($title)") | Out-Null
        }
    }
    return $true
}
[Win32]::EnumWindows($enumProc, [IntPtr]::Zero) | Out-Null

foreach ($r in $script:results) {
    Write-Host $r
}
`.trim();

const tmpFile = path.join(os.tmpdir(), 'list_windows_' + Date.now() + '.ps1');
fs.writeFileSync(tmpFile, script, 'utf8');

let output = '';
try {
    output = execSync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`, {
        encoding: 'utf8',
        timeout: 30000
    });
} catch (e) {
    output = e.stdout || '';
}
try { fs.unlinkSync(tmpFile); } catch (e) {}

console.log('All visible windows:');
console.log('====================');

const lines = output.trim().split(/\r?\n/).filter(l => l.trim());
for (const line of lines) {
    if (line.toLowerCase().includes('trae')) {
        console.log('>>> ' + line);
    } else {
        console.log('    ' + line);
    }
}
