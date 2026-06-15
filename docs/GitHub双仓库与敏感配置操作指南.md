# GitHub 双仓库与敏感配置操作指南

## 1. 推荐结构

本项目涉及两个用途不同的 GitHub 仓库：

| 用途 | 推荐管理方式 |
| --- | --- |
| VersionFastPro 自动化脚本源码同步 | 将 `D:\VersionFastPro` 初始化为 Git 仓库，远程仓库命名为 `origin` |
| 自动化运行时上传生成项目 | 继续由 `config.json` 中的 `github.repository` 指向 `https://github.com/ZSL-haut/Solo.git` |

这两个仓库不需要在运行过程中反复切换。

- 执行 `git push origin main`：上传自动化脚本源码。
- 程序运行时：读取 `config.json`，把生成的项目上传到 Solo。
- `.github_upload/Solo` 只是程序使用的 Solo 本地缓存，不应提交到源码仓库。



查看哪些项目被忽略了：

```
git status --ignored
```



## 2. 创建并连接源码仓库

先在 GitHub 新建一个空仓库，例如：

```text
https://github.com/你的账号/VersionFastPro.git
```

不要在 GitHub 页面自动创建 README、`.gitignore` 或 License，避免第一次推送产生历史冲突。

在 PowerShell 中执行：

```powershell
cd D:\VersionFastPro
git init
git branch -M main
git remote add origin https://github.com/NUDT-ZSL/SoloAutoDemo.git
```

### 查看远程仓库

查看所有远程仓库及其拉取、推送地址：

```powershell
git remote -v
```

只查看 `origin` 地址：

```powershell
git remote get-url origin
```

检查远程仓库是否可以连接：

```powershell
git ls-remote origin
```

查看当前分支及其跟踪关系：

```powershell
git branch -vv
git status -sb
```

正常情况下，源码仓库应显示为：

```text
origin  https://github.com/你的账号/VersionFastPro.git
```

不要把根目录的 `origin` 设置为 Solo，否则执行普通 `git push` 时可能把自动化脚本推送到生成项目仓库。

## 3. 两类仓库的配置位置

### 源码同步仓库

由根目录 Git 配置管理：

```powershell
git remote get-url origin
```

### 生成项目仓库

由 `config.json` 管理：

```json
{
  "github": {
    "repository": "https://github.com/ZSL-haut/Solo.git",
    "branch": "main"
  }
}
```

程序上传生成项目时，不读取根目录的 `origin`，而是读取这里的地址。

因此：

- 修改根目录 `origin`，只影响自动化脚本源码的推送。
- 修改 `config.json` 的 `github.repository`，只影响程序运行时生成项目的上传。

## 4. 切换源码远程仓库

查看当前地址：

```powershell
git remote get-url origin
```

修改为另一个源码仓库：

```powershell
git remote set-url origin https://github.com/你的账号/新的源码仓库.git
```

再次确认：

```powershell
git remote -v
git ls-remote origin
```

也可以保留多个源码远程仓库：

```powershell
git remote add backup https://github.com/另一个账号/VersionFastPro.git
git remote -v
```

分别推送：

```powershell
git push origin main
git push backup main
```

建议始终显式写远程名称和分支：

```powershell
git push origin main
```

这样比直接执行 `git push` 更不容易推错仓库。

## 5. 防止 API Key 上传

推荐保留两个配置文件：

```text
config.json          本机真实配置，不提交
config.example.json  配置模板，可以提交
```

在根目录创建 `.gitignore`，至少加入：

```gitignore
# Local secrets and machine-specific settings
config.json

# Runtime repository cache
.github_upload/

# Generated and temporary files
__pycache__/
*.pyc
*.log
~$*
```

根据同步需求，还可以忽略生成结果：

```gitignore
tasks/
*.xlsx
```

创建配置模板时，将 API Key 留空，并把本机路径改为示例：

```json
{
  "paths": {
    "trae_executable": "请填写 Trae CN 启动文件路径",
    "python_executable": "请填写 Anaconda 环境 python.exe 路径"
  },
  "deepseek": {
    "api_key": "",
    "base_url": "https://api.deepseek.com",
    "model": "deepseek-chat"
  }
}
```

其他人克隆项目后执行：

```powershell
Copy-Item config.example.json config.json
```

然后只修改自己的 `config.json`。

### 如果 config.json 已被 Git 跟踪

仅添加 `.gitignore` 不够，还需要取消跟踪：

```powershell
git rm --cached config.json
git add .gitignore config.example.json
git commit -m "Stop tracking local configuration"
git push origin main
```

该命令不会删除本机的 `config.json`。

如果 API Key 曾经提交并推送到 GitHub，应立即在服务商后台作废并重新生成。删除文件或新增 `.gitignore` 不能消除 Git 历史中已经泄露的密钥。

## 6. 第一次上传源码

确认忽略规则：

```powershell
git status --short
git check-ignore -v config.json
git check-ignore -v .github_upload
```

`config.json` 应被 `.gitignore` 命中，不应出现在待提交列表中。

然后执行：

```powershell
git add .
git status
git commit -m "Initial VersionFastPro source"
git push -u origin main
```

推送前务必检查：

```powershell
git diff --cached --name-only
git diff --cached
```

重点确认没有 `config.json`、API Key、缓存仓库或不需要的生成文件。

## 7. 只上传指定文件

Git 不能把单个文件脱离提交直接推送。正确流程是只暂存指定文件，然后提交并推送该提交。

例如只上传两个脚本和一份文档：

```powershell
git add run_multi_round.js multi_round_helper.py docs/GitHub双仓库与敏感配置操作指南.md
git diff --cached --name-only
git commit -m "Update multi-round automation"
git push origin main
```

如果误暂存了文件，可以取消暂存：

```powershell
git restore --staged config.json
```

取消暂存不会删除本地文件。

## 8. 只拉取指定文件

先获取远程仓库最新信息，但不合并全部内容：

```powershell
git fetch origin
```

从远程 `main` 获取指定文件：

```powershell
git restore --source origin/main -- multi_round_helper.py
```

获取指定目录：

```powershell
git restore --source origin/main -- docs
```

查看远程版本而不覆盖本地文件：

```powershell
git show origin/main:multi_round_helper.py
```

注意：`git restore --source` 会覆盖指定路径的本地内容。执行前先查看状态：

```powershell
git status --short
git diff -- multi_round_helper.py
```

## 9. 日常同步流程

上传源码：

```powershell
cd D:\VersionFastPro
git status
git pull --rebase origin main
git add 指定文件
git diff --cached
git commit -m "说明本次修改"
git push origin main
```

其他人首次获取：

```powershell
git clone https://github.com/你的账号/VersionFastPro.git
cd VersionFastPro
Copy-Item config.example.json config.json
```

其他人后续更新：

```powershell
git pull --rebase origin main
```

因为 `config.json` 不被 Git 跟踪，正常拉取不会覆盖每个人自己的 API Key 和本机路径配置。

## 10. 推送前检查清单

每次推送前执行：

```powershell
git remote -v
git status --short
git diff --cached --name-only
git diff --cached
```

确认：

1. `origin` 是源码同步仓库，不是 Solo。
2. `config.json` 没有被暂存。
3. `.github_upload/` 没有被暂存。
4. 提交列表只有本次需要同步的源码和文档。
5. `config.json` 中的 Solo 地址只用于程序运行时上传生成项目。
