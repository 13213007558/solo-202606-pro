# VersionFastPro

Windows 上的 Trae CN 自动化项目，用于批量发送代码生成任务、执行多轮对话、收集 SessionID/Trace、上传生成项目并导出结果。

## 快速开始

1. 安装 Node.js、Git 和 Python/Anaconda。
2. 安装 Python 依赖：

```powershell
pip install -r requirements.txt
```

3. 创建本地配置：

```powershell
Copy-Item config.example.json config.json
```

4. 修改 `config.json` 中的 Trae、Python、DeepSeek 和生成项目仓库参数。
5. 将首轮提示词放入 `example/`，然后运行：

```powershell
node run_multi_round_auto.js
```

## 主要入口

| 文件 | 用途 |
| --- | --- |
| `run_multi_round_auto.js` | 推荐入口，无需人工确认的多轮自动化 |
| `run_multi_round.js` | 多轮自动化主流程 |
| `generate.py` | 生成首轮提示词 |
| `process_xlsx.py` | 清理和检查多轮结果 |

完整脚本分类见 [docs/脚本索引.md](docs/脚本索引.md)。

## 目录说明

| 目录 | 内容 |
| --- | --- |
| `docs/` | 操作手册和维护文档 |
| `images/` | Trae 界面识别图片 |
| `example/` | 待执行的首轮提示词，本地生成内容默认不提交 |
| `tasks/` | 自动化生成的项目和结果，本地生成内容默认不提交 |
| `test/` | 手工测试脚本 |
| `.github_upload/` | 生成项目仓库缓存，不提交 |

## 配置与密钥

- `config.json`：本机真实配置，已加入 `.gitignore`。
- `config.example.json`：可提交的配置模板，不包含 API Key。
- DeepSeek 环境变量仍可覆盖配置文件：
  `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`。

## 仓库说明

根目录 Git 的 `origin` 用于同步本项目源码。程序运行时上传生成项目的仓库由 `config.json` 中的 `github.repository` 单独控制。

详细操作见 [docs/GitHub双仓库与敏感配置操作指南.md](docs/GitHub双仓库与敏感配置操作指南.md)。
