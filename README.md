# Solo Trae 多轮自动化

这个项目现在支持 Windows 和 macOS。当前 Mac M2 推荐按下面的 macOS 流程配置，窗口控制会走 `osascript`，截图和点击仍由 `pyautogui` 完成。

## 环境要求

| 依赖 | 说明 |
|------|------|
| Python 3.10+ arm64 | M2 上建议使用系统 Python、Homebrew Python、Miniforge 或 uv 创建原生 arm64 环境 |
| Node.js 18+ arm64 | 运行自动化主流程 |
| Git | 上传生成项目 |
| Trae CN | 被测 AI 编程工具 |

确认当前架构：

```bash
uname -m
node -v
python3 -V
```

`uname -m` 应输出 `arm64`。如果 Python 或 Node 是 x86_64 版本，建议换成 arm64 版本后再安装依赖。

## macOS 快速开始

### 1. 创建 Python 环境

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 2. 配置 macOS 权限

自动化需要系统权限，否则可能无法截图、找图或发送按键。

打开 `系统设置 -> 隐私与安全性`，给你运行脚本的应用授权：

| 权限 | 常见需要加入的应用 |
|------|--------------------|
| 辅助功能 | Codex、Terminal、iTerm、VS Code、Python、osascript |
| 屏幕录制 | Codex、Terminal、iTerm、VS Code、Python |

授权后最好重启终端或 Codex。

### 3. 配置 config.json

```bash
cp config_example.json config.json
```

至少修改这几项：

| 配置项 | macOS 示例 | 说明 |
|--------|------------|------|
| `paths.trae_executable` | `/usr/local/bin/trae-cn` | 本机已验证的 Trae CN CLI 路径，备选 `/opt/homebrew/bin/trae-cn` 或 `/Applications/Trae CN.app` |
| `paths.trae_app_name` | `Trae CN` | AppleScript 查找窗口的进程名 |
| `paths.python_executable` | `/Users/apple/miniconda3/bin/python3` | 本机已验证的 arm64 Python；也可换成 `/Users/apple/Documents/solo/demo-Solo/.venv/bin/python` |
| `deepseek.api_key` | `sk-...` | DeepSeek API Key |
| `github.repository` | `https://github.com/username/repo.git` | 上传生成项目的仓库 |

如果 Trae 在系统里显示为 `Trae` 而不是 `Trae CN`，把 `paths.trae_app_name` 改成 `Trae`。

### 4. 生成首轮提示词

```bash
source .venv/bin/activate
python generate.py -n 100
```

提示词会保存在 `example/` 目录下。

### 5. 检查 Trae 窗口识别

先手动打开一次 Trae，然后运行：

```bash
node list_windows.js
```

如果没有列出窗口，优先检查 `paths.trae_app_name` 和 macOS 辅助功能权限。

### 6. 启动多轮自动化

```bash
node run_multi_round_auto.js --rounds 3 --wait-seconds 1200 --batch-size 4
```

M2 上建议先把 `--batch-size` 设为 `2` 或 `4` 试跑，确认窗口识别、截图匹配和系统权限都正常后再提高并发。

## 运行模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 全自动 | `node run_multi_round_auto.js` | 无需人工确认，自动开始 |
| 手动确认 | `node run_multi_round.js` | 启动前需输入 Y 确认 |
| 定时执行 | `node schedule_run.js 22:00` | 在指定时间自动启动 |

定时执行示例：

```bash
node schedule_run.js 00:00 node run_multi_round_auto.js --rounds 3 --wait-seconds 1200 --batch-size 4
```

## 每轮执行流程

```text
第 N 轮
  1. 发送提示词并获取 SessionID
  2. 等待 AI 响应并自动点击对话框按钮
  3. 检测 Stop 按钮
  4. 获取 Trace
  5. 生成不满意原因
  6. Git 上传代码
  7. 生成下一轮提示词

最终导出 multi_round_results.xlsx
```

## 输出文件

| 文件 | 说明 |
|------|------|
| `tasks/autoN/` | 每个任务的工作目录 |
| `tasks/autoN/result_autoN.json` | 单任务详细数据 |
| `multi_round_results.xlsx` | 所有任务的汇总 Excel |
| `log/` | 运行日志 |

## 常见问题

| 现象 | 处理 |
|------|------|
| 找不到窗口 | 运行 `node list_windows.js`，检查 `paths.trae_app_name` 是否匹配 |
| 无法截图或找不到按钮 | 检查屏幕录制权限，确认 Trae 窗口在当前桌面且没有被遮挡 |
| 无法粘贴或发送按键 | 检查辅助功能权限 |
| `pyautogui` 导入或启动卡住 | 从已授权的前台 Terminal/iTerm 运行，授权后重启终端；不要从无 GUI 权限的后台会话直接跑 |
| `opencv-python` 安装失败 | 先升级 `pip setuptools wheel`，并确认 Python 是 arm64 |
| SessionID 或 Trace 获取失败 | 重新截取 `images/` 里的按钮素材，macOS Retina 屏幕缩放可能影响图像匹配 |

## Git 代理配置

```bash
git config --global --get http.proxy
git config --global --get https.proxy

git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```
