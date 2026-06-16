# VersionFastPro

基于 Trae CN 的 AI 代码生成多轮自动化测试平台。自动生成提示词、发送至 Trae CN、收集执行结果、迭代多轮对话，并汇总导出。

## 环境要求

| 依赖 | 说明 |
|------|------|
| [Anaconda](https://www.anaconda.com/) | Python 环境管理（[安装教程](https://www.csdn.net/)） |
| [Node.js](https://nodejs.org/) | 运行自动化主流程 |
| [Git Bash](https://git-scm.com/) | 版本控制与代码上传 |
| [Trae CN](https://www.trae.com.cn/) | 被测 AI 编程工具 |

## 快速开始

### 1. 创建 Conda 环境

```powershell
conda create -n project python=3.10
conda activate project
pip install -r requirements.txt
```

### 2. 配置 config.json

先把config_example修改为config.json

需修改以下 **4 项**：

| 配置项 | 路径 | 说明 |
|--------|------|------|
| Trae CN 路径 | `paths.trae_executable` | 本机 Trae CN 启动文件路径，如 `C:\\Users\\xxx\\AppData\\Local\\Trae CN\\bin\\trae-cn.cmd` |
| Python 路径 | `paths.python_executable` | Anaconda 环境中的 python.exe 路径 |
| DeepSeek API Key | `deepseek.api_key` | 在 [platform.deepseek.com](https://platform.deepseek.com) 获取 |
| GitHub 仓库地址 | `github.repository` | 上传生成项目的仓库 URL，如 `https://github.com/username/repo.git` |

> 其余参数均有默认值，无需修改即可运行。完整配置说明见 `config.json` 中的注释。

### 3. 生成首轮提示词

```powershell
conda activate project
python generate.py -n 100
```

- `-n` 指定生成数量，提示词保存在 `example/` 目录下
- 默认使用 DeepSeek API 生成，覆盖游戏开发、3D/交互可视化、Web 前端、全栈 Web 应用四个领域

### 4. 启动多轮自动化

```powershell
node run_multi_round_auto.js --rounds 3 --wait-seconds 900 --batch-size 8
```

| 参数 | 说明 |
|------|------|
| `--rounds` | 对话轮数 |
| `--wait-seconds` | 每轮等待 AI 响应的时间（秒） |
| `--batch-size` | 同时打开的 Trae CN 窗口数 |

## 运行模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 全自动 | `node run_multi_round_auto.js` | 无需人工确认，自动开始 |
| 手动确认 | `node run_multi_round.js` | 启动前需输入 Y 确认 |
| 定时执行 | `node schedule_run.js 22:00` | 在指定时间自动启动 |

定时执行示例——凌晨 00:00 运行：

```powershell
node schedule_run.js 00:00 node run_multi_round_auto.js --rounds 3 --wait-seconds 900 --batch-size 8
```

## 每轮执行流程

```
第 N 轮
  ├── 1. 发送提示词 + 获取 SessionID
  ├── 2. 等待 AI 响应 + 自动点击对话框按钮
  ├── 3. Stop 检测
  ├── 4. Git 上传代码
  ├── 5. 获取 Trace（执行轨迹）
  ├── 6. 清理 Trace 异常信息
  ├── 7. 生成不满意原因
  └── 8. 生成下一轮提示词（Bug修复 / Feature迭代）

最终 → 导出 multi_round_results.xlsx
```

## 输出文件

| 文件 | 说明 |
|------|------|
| `tasks/autoN/` | 每个任务的工作目录（提示词 + 生成代码 + 结果） |
| `tasks/autoN/result_autoN.json` | 单任务详细数据（SessionID、Trace、不满意原因等） |
| `multi_round_results.xlsx` | 所有任务的汇总 Excel 表 |

## 命令行参数一览

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--rounds` | 3 | 总对话轮数 |
| `--batch-size` | 8 | 每批并发窗口数 |
| `--wait-seconds` | 600 | 每轮等待 AI 响应时间（秒） |
| `--switch-interval` | 15 | 窗口轮询切换间隔（秒） |
| `--stop-dwell` | 10 | Stop 按钮检测停留时间（秒） |
| `--upload-timeout` | 10 | Git 上传超时（秒） |
| `--trace-timeout` | 10 | Trace 获取超时（秒） |
| `--prompt-gen-time` | 60 | 下一轮提示词生成等待时间（秒） |

## 项目结构

```
SoloDemo/
├── config.json              # 运行配置（含注释说明）
├── app_config.js            # Node.js 配置加载模块
├── config_loader.py         # Python 配置加载模块
├── generate.py              # 首轮提示词生成
├── run_multi_round.js       # 多轮自动化主流程（手动确认）
├── run_multi_round_auto.js  # 多轮自动化主流程（全自动）
├── schedule_run.js          # 定时任务启动器
├── multi_round_helper.py    # Git上传/Trace清理/不满意原因/提示词生成
├── trae_helper.py           # Trae 窗口自动化（屏幕识别+点击）
├── runtime_logger.js        # 运行日志记录
├── process_xlsx.py          # Excel 结果后处理
├── get_coordinates.py       # 坐标获取工具
├── list_windows.js          # 窗口列表工具
├── requirements.txt         # Python 依赖
├── images/                  # 屏幕识别截图素材
├── example/                 # 生成的提示词存放目录
├── tasks/                   # 任务工作目录
└── log/                     # 运行日志
```



## 代理配置

```
# 查看 HTTP/HTTPS 代理
git config --global --get http.proxy
git config --global --get https.proxy

# 设置代理（假设代理运行在 127.0.0.1:7890）
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

```
