#python generate.py -n 5 -s 101  # 从101开始生成5个文件
import os
import argparse
import json
import re
import time
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional, Any
from openai import OpenAI
from config_loader import get_config, get_deepseek_config

# 配置常量
CONFIG = {
    "DOMAINS": ["游戏开发", "3D/交互可视化", "Web前端", "全栈web应用"],
    "MAX_RETRIES": int(get_config("deepseek.max_retries", 5)),
    "RETRY_DELAY": int(get_config("deepseek.retry_delay_seconds", 2)),  # 秒
    "BATCH_DELAY": 1,  # 秒
    "API_MODEL": get_config("deepseek.model", "deepseek-chat"),
    "MAX_EXISTING_SUMMARY": 20,  # 最多显示多少条已有提示词摘要
    "CONTENT_PREVIEW_LENGTH": 300,  # 预览内容长度
}

API_KEY, API_BASE_URL, API_MODEL = get_deepseek_config()
CONFIG["API_MODEL"] = API_MODEL
client = OpenAI(api_key=API_KEY, base_url=API_BASE_URL)

SYSTEM_PROMPT = """你是代码大模型测试提示词生成助手。

## 技术限制
- 允许：Python (Django/Flask/FastAPI), JavaScript/TypeScript, HTML/CSS
- 禁止：Go、C/C++、数据库相关内容

## 固定参数
- 任务类型：0-1代码生成
- 业务领域：游戏开发、Web前端、3D/交互可视化、全栈Web应用。
- 修改范围：模块内多文件 或 跨模块多文件（由用户消息指定）。

## 类型定义（生成提示词时请遵循）
- 模块内多文件：涉及同一模块内的接口定义与实现协同
- 跨模块多文件：涉及多个独立模块之间的接口调用与数据传递

## 提示词要求

### 关键约束（必须遵守）
1. **模块内多文件**：大部分情况下要求 4-6 个文件的模块化结构。
   **跨模块多文件**：要求 6-8 个文件，分布在至少 2 个不同的功能模块中，模块间有明确的接口调用关系。
2. **最重要：必须保证可以运行**，提示词里一定要明确要求完整的运行配置：
   - package.json（含所有依赖和启动脚本）
   - 入口 HTML 文件
   - tsconfig.json（如果使用 TypeScript）
   - 构建配置（如 vite.config.js）
   - 清晰的运行说明（如 "npm install && npm run dev"）
3. 如果使用 TypeScript，必须要求包含完整的 TypeScript 配置
4. 确保生成的所有代码必须能够直接运行，不能需要用户自己额外配置环境
5. **技术栈位置（重要）**：绝对不要将使用的技术栈（如"帮我使用 TypeScript 和 React"）放在提示词开头！必须将技术栈放在中间或后面，先描述项目目标和功能。例如：
   错误格式："帮我使用 TypeScript 和 React 开发一个..."
   正确格式："开发一个...项目，实现...功能。使用TypeScript和React实现。文件结构如下：..."

### 需求设计
1. 模块内多文件（4-6个文件，明确每个文件职责）
2. **提示词要简洁精炼**：不要过于冗长，需求描述要清晰但不要过度细节化
3. 包含5-7个需求，涵盖：
   - 主要功能需求
   - 丰富的界面要求（页面布局设计、颜色主题搭配、动画过渡效果、交互反馈、响应式适配、视觉风格统一等，描述要具体一些）
   - 至少1个性能约束（FPS/响应时间）
4. 不能是简单CRUD，要有一定深度（中等难度）
5. 业务场景必须与之前生成的完全不同

### 格式禁令（生成的提示词内容必须遵守）
生成的"提示词内容"中，绝对不能出现以下符号或写法：
- 禁止 * 或 ** 加粗标记
- 禁止 [] 或【】方括号做标签或标题
- 禁止「」书名号引用项目名
- 禁止 # 或 ## Markdown标题语法
- 禁止 • · 等圆点符号做列表
- 列表统一使用 " - " 短横线前缀
- 编号使用 1) 2) 3) 或 1. 2. 3. 的形式
- 文件职责说明使用圆括号（），不要用方括号

### 开头多样性（重要）
提示词的开头必须多样化，严禁每次都用"开发一个名为xxx的"这种固定句式。以下是4种可选的开头风格，每次随机选一种：
- 风格1（场景切入）："最近在做一个xxx方向的项目，需要实现..."
- 风格2（需求驱动）："需要搭建一个xxx系统，核心功能包括..."
- 风格3（目标描述）："做一个xxx应用，要能够支持..."
- 风格4（问题解决）："想做一个解决xxx问题的工具，主要思路是..."
项目名称直接写在句中，不要加任何引号或书名号包裹。

### 格式多样性（重要）
提示词的表达格式要保持多样化，不要每次都用同一种结构。下面列出几种可选写法，用户消息中会指定本次使用哪一种，请严格按照指定格式组织内容。无论使用哪种格式，上面"关键约束"和"需求设计"里的所有限制都必须满足，只是组织方式不同。所有格式都必须遵守上面的"格式禁令"。

#### 格式A：场景引入 + 文件结构 + 需求段落
> 场景：[1-2句业务背景描述]。\\n\\n构建一个XXX应用，使用[技术栈]。文件结构按职责模块化，并注明各文件间的调用关系和数据流向：\\n - package.json（含依赖：...，启动脚本：npm run dev）\\n - vite.config.js（构建配置）\\n - tsconfig.json（严格模式）\\n - index.html（入口）\\n - src/xxx.ts（职责描述，数据流向：接收...→处理...→输出...）\\n\\n功能需求：\\n1) 需求名称：具体描述\\n2) 需求名称：具体描述\\n\\n界面要求：[自然段落描述布局、配色、动画、响应式等]\\n\\n性能约束：[具体指标]

#### 格式B：直接陈述 + 文件清单 + 编号需求
> 开发一个XXX应用，实现[一句话目标]。使用[技术栈]实现，文件结构如下：\\n - package.json（依赖和启动脚本）\\n - index.html（入口页面）\\n - src/xxx.ts（职责说明）\\n ...\\n\\n具体需求：\\n1. 需求描述\\n2. 需求描述\\n...\\n\\n界面方面：[段落描述]。\\n\\n性能要求：[指标描述]。

#### 格式C：需求驱动 + 文件分工
> 我需要一个能够[做什么]的应用，主要解决[什么问题]。\\n\\n它应当具备以下能力：\\n1) 需求描述\\n2) 需求描述\\n...\\n\\n界面方面要求：[段落描述]。性能上需要[指标]。\\n\\n实现采用[技术栈]，按以下文件组织代码：\\n - package.json（依赖和脚本）\\n - index.html（入口）\\n - src/xxx.ts（职责）\\n ...\\n\\n运行方式：npm install && npm run dev。

#### 格式D：对话式自然描述
> 我想做一个XXX的项目，想法是[简短描述背景和目标]。希望它能做到：第一，[需求]；第二，[需求]；第三，[需求]。界面上希望[具体描述布局、配色、动画]，性能上希望[指标]。\\n\\n实现用[技术栈]，把代码拆成以下文件：\\n - package.json（含依赖和启动脚本）\\n - index.html（入口）\\n - src/xxx.ts（职责）\\n ...\\n\\n跑 npm install && npm run dev 就能直接看到效果。

## 输出格式
{
  "任务类型": "0-1代码生成",
  "业务领域": "游戏开发",
  "修改范围": "模块内多文件 或 跨模块多文件（按用户消息指定）",
  "提示词内容": "[按用户指定的格式组织的提示词内容，使用\\n换行]"
}

## 重要说明
1. 必须严格按照上述JSON格式输出，键名必须完全一致："任务类型"、"业务领域"、"修改范围"、"提示词内容"
2. 提示词内容中，绝对不能以"帮我使用 ..."开头！必须先描述项目目标和功能，再将技术栈放在中间或后面说明
3. 只输出JSON，不要其他任何内容。提示词用\\n换行，不要空行。
4. 必须使用用户消息中指定的"格式"来组织提示词；不要每次都套用同一种结构。
5. 提示词内容中严禁出现以下符号：*（星号加粗）、**（双星号加粗）、[]（方括号标签）、【】（中文方括号标签）、#（Markdown标题）、•（圆点）、·（间隔号）。列表用 " - " 短横线，编号用 1) 2) 或 1. 2. 格式，文件说明用圆括号（）。"""

def load_existing_data() -> Tuple[List[Dict[str, Any]], Set[int]]:
    """
    一次性加载所有现有提示词数据和ID集合
    返回: (提示词列表, ID集合)
    """
    example_dir = os.path.join(os.path.dirname(__file__), 'example')
    if not os.path.exists(example_dir):
        return [], set()

    existing_prompts: List[Dict[str, Any]] = []
    existing_ids: Set[int] = set()

    for file in os.listdir(example_dir):
        match = re.match(r'prompt_(\d+)\.(json|txt|done\.json)', file)
        if match:
            file_id = int(match.group(1))
            existing_ids.add(file_id)

            # 只对 .json 文件加载内容
            if file.endswith('.json'):
                file_path = os.path.join(example_dir, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if '提示词内容' in data:
                            existing_prompts.append({
                                'domain': data.get('业务领域', ''),
                                'content': data['提示词内容'][:CONFIG["CONTENT_PREVIEW_LENGTH"]],
                                'id': file_id
                            })
                except (json.JSONDecodeError, IOError) as e:
                    # 记录错误但不中断程序
                    print(f"  警告: 无法读取文件 {file}: {e}")

    return existing_prompts, existing_ids

def select_domain(existing_prompts: List[Dict[str, Any]]) -> str:
    """智能选择领域，保证各领域分布均匀"""
    domains = CONFIG["DOMAINS"].copy()  # 创建副本避免修改原列表

    # 统计各领域使用次数
    domain_count = defaultdict(int)
    for p in existing_prompts:
        domain_count[p['domain']] += 1

    # 优先选择使用最少的领域
    import random
    domains.sort(key=lambda d: (domain_count[d], random.random()))
    return domains[0]

def build_user_prompt_content(existing_prompts: List[Dict[str, Any]], selected_domain: str) -> str:
    """构建用户提示词内容"""
    import random

    # 可选的提示词组织格式（与 SYSTEM_PROMPT 中的 A-D 对应）
    format_styles = [
        ("A", "场景引入 + 文件结构 + 需求段落",
         '以"场景：..."开头，用1-2句话描述业务背景，然后另起一行用"构建一个..."过渡到技术描述，'
         '用 " - " 列出文件结构（每个文件后面用圆括号说明职责和数据流向），'
         '功能需求用 1) 2) 编号，界面要求和性能约束分别用自然段落描述。'),
        ("B", "直接陈述 + 文件清单 + 编号需求",
         '以"开发一个..."或"构建一个..."直接开头，一句话说明项目目标，'
         '然后说明技术栈，用 " - " 列出文件结构（圆括号说明职责），'
         '需求用 1. 2. 3. 编号列出，界面和性能分段描述。'),
        ("C", "需求驱动 + 文件分工",
         '以"我需要一个能够..."开头，说明要解决什么问题，'
         '然后用 1) 2) 列出功能需求，再描述界面要求和性能指标，'
         '最后才交代技术栈和文件结构（用 " - " 列出，圆括号说明职责），给出运行命令。'),
        ("D", "对话式自然描述",
         '用口语化的语气，以"我想做一个..."开头，自然地描述背景和目标，'
         '用"第一，...；第二，...；第三，..."的形式嵌入需求，'
         '界面和性能要求编织在段落中，文件结构用 " - " 列出（圆括号说明职责），最后给出运行命令。'),
    ]

    # 统计最近 6 条已有提示词使用过的格式（基于简单启发式判断），尽量避开
    def detect_style(text: str) -> Optional[str]:
        t = text.strip()
        if t.startswith("场景"):
            return "A"
        if t.startswith("开发") or t.startswith("构建") or t.startswith("实现") or t.startswith("制作"):
            return "B"
        if t.startswith("我需要") or t.startswith("我想要"):
            return "C"
        if t.startswith("我想做") or t.startswith("我想") or t.startswith("我打算"):
            return "D"
        return None

    recent_styles = [detect_style(p['content']) for p in existing_prompts[-6:]]
    recent_styles = [s for s in recent_styles if s]
    candidates = [f for f in format_styles if f[0] not in recent_styles[-2:]]
    if not candidates:
        candidates = format_styles
    chosen = random.choice(candidates)
    style_code, style_name, style_instruction = chosen

    # 随机选择修改范围
    scope_type = random.choice(["模块内多文件", "跨模块多文件"])
    file_count = "4-6个文件" if scope_type == "模块内多文件" else "6-8个文件，分布在至少2个功能模块中"

    user_content = f"""请生成一个新的测试提示词。
业务领域优先选择：{selected_domain}
修改范围：{scope_type}

【本次提示词使用格式】格式{style_code} —— {style_name}
格式要求：{style_instruction}
请严格按上述格式组织"提示词内容"字段，不要套用其他格式的结构。

要求：
1. 确保业务场景与之前生成的所有提示词完全不同，绝对不能雷同，主题也不能重复。
2. 必须是中等难度任务，使用{scope_type}项目（{file_count}），不要单文件。
3. 必须让被测模型无法一轮完整交付。
4. 最重要、最关键：提示词里一定要明确要求包含完整的运行配置（package.json、入口HTML、tsconfig.json、构建配置等），确保可以直接运行，这一点绝对不能忘记！
5. 必须包含丰富的界面要求：页面布局设计、颜色主题搭配、动画过渡效果、交互反馈、响应式适配、视觉风格统一等，描述要具体一些。
6. 提示词整体要简洁精炼，不要过于冗长和过度细节化。
7. 不要生成和已有提示词类似的项目主题，要完全不同的创意。
8. 提示词格式：绝对不要将使用的技术栈（如"帮我使用 TypeScript 和 React"）放在提示词开头！必须将技术栈放在中间或后面，先描述项目目标和功能。例如：
   错误格式："帮我使用 TypeScript 和 React 开发一个..."
   正确格式："开发一个...项目，实现...功能。使用TypeScript和React实现。文件结构如下：..."
9. 本次必须使用上面指定的"格式{style_code}"来写"提示词内容"，让每次生成的提示词看起来风格不同，但所有需求/限制不变。
"""

    if existing_prompts:
        user_content += "\n\n以下是已有的提示词摘要（请避免重复类似的业务场景，也避免与最近几条使用相同的组织格式）：\n"
        for i, p in enumerate(existing_prompts[-CONFIG["MAX_EXISTING_SUMMARY"]:], 1):
            user_content += f"{i}. [{p['domain']}] {p['content']}...\n"

    return user_content

def parse_api_response(content: str) -> Optional[Dict[str, Any]]:
    """解析API响应，尝试提取JSON数据"""
    # 尝试直接解析
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # 如果失败，尝试提取 JSON 部分
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return None

def validate_and_fix_prompt_data(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    验证并修复提示词数据
    必需键：任务类型, 业务领域, 修改范围, 提示词内容
    如果键名不对，尝试修复或返回None
    """
    if not isinstance(data, dict):
        return None

    required_keys = {"任务类型", "业务领域", "修改范围", "提示词内容"}
    data_keys = set(data.keys())

    # 如果包含所有必需键，直接返回
    if required_keys.issubset(data_keys):
        return data

    # 尝试修复常见的键名错误
    key_mapping = {
        "c": "提示词内容",
        "content": "提示词内容",
        "type": "任务类型",
        "domain": "业务领域",
        "scope": "修改范围",
        "task_type": "任务类型",
        "business_domain": "业务领域",
        "modification_scope": "修改范围",
        "prompt_content": "提示词内容"
    }

    fixed_data = {}
    for key, value in data.items():
        if key in key_mapping:
            fixed_data[key_mapping[key]] = value
        else:
            fixed_data[key] = value

    # 再次检查必需键
    fixed_keys = set(fixed_data.keys())
    if required_keys.issubset(fixed_keys):
        return fixed_data

    # 如果仍然缺少必需键，尝试从现有键推断
    # 检查是否有类似"帮我使用..."的内容，可能整个响应就是提示词内容
    for key, value in data.items():
        if isinstance(value, str) and len(value) > 50:
            # 如果有一个长字符串，可能整个响应就是提示词内容
            # 创建一个默认结构
            default_data = {
                "任务类型": "0-1代码生成",
                "业务领域": "Web前端",
                "修改范围": scope_type,
                "提示词内容": value
            }
            # 合并现有数据
            default_data.update({k: v for k, v in data.items() if k not in default_data})
            return default_data

    return None

def clean_prompt_content(text: str) -> str:
    """清理提示词内容中的AI味符号，作为兜底措施"""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'(?<!\w)\*(.+?)\*(?!\w)', r'\1', text)
    text = text.replace('【', '').replace('】', '')
    text = re.sub(r'^#{1,3}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'(?m)^[•·]\s*', ' - ', text)
    text = re.sub(r'(?m)^\((\d+)\)\s*', r'\1) ', text)
    return text

def generate_prompt() -> Dict[str, Any]:
    """生成一个提示词，直到获得合法的 JSON 数据为止"""
    existing_prompts, _ = load_existing_data()
    selected_domain = select_domain(existing_prompts)

    user_content = build_user_prompt_content(existing_prompts, selected_domain)

    max_retries = CONFIG["MAX_RETRIES"]
    for attempt in range(max_retries):
        try:
            print(f"  正在调用 API (尝试 {attempt + 1}/{max_retries})...")
            response = client.chat.completions.create(
                model=CONFIG["API_MODEL"],
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                stream=False
            )
            content = response.choices[0].message.content

            # 尝试解析 JSON
            data = parse_api_response(content)
            if data is not None:
                # 验证和修复数据
                validated_data = validate_and_fix_prompt_data(data)
                if validated_data is not None:
                    # 检查提示词内容格式
                    prompt_content = validated_data.get("提示词内容", "")
                    if isinstance(prompt_content, str):
                        if prompt_content.strip().startswith("帮我使用"):
                            print(f"  ⚠️  提示词格式错误（以'帮我使用'开头），将重新生成...")
                            continue
                        validated_data["提示词内容"] = clean_prompt_content(prompt_content)
                    return validated_data

            # 如果还是失败，重试
            print(f"  ⚠️  无法解析 JSON (尝试 {attempt + 1}/{max_retries})，将重新生成...")

        except Exception as e:
            print(f"  ⚠️  API 调用失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print(f"  等待 2 秒后重试...")
                time.sleep(CONFIG["RETRY_DELAY"])

    raise Exception(f"经过 {max_retries} 次尝试后仍无法生成合法的 JSON")

def save_prompt_to_file(data: Dict[str, Any], index: int, force: bool = False) -> Tuple[str, int]:
    """保存提示词到文件。如果文件已存在且未指定force，自动递增编号避免覆盖。
    返回: (文件路径, 实际使用的编号)
    """
    example_dir = os.path.join(os.path.dirname(__file__), 'example')
    os.makedirs(example_dir, exist_ok=True)

    original_index = index
    file_path = os.path.join(example_dir, f'prompt_{index:03d}.json')

    # 如果文件已存在且未指定force，自动寻找下一个可用编号
    if not force:
        while os.path.exists(file_path):
            index += 1
            file_path = os.path.join(example_dir, f'prompt_{index:03d}.json')
        if index != original_index:
            print(f"  ⚠️  prompt_{original_index:03d}.json 已存在，自动使用新编号: prompt_{index:03d}.json")
    else:
        if os.path.exists(file_path):
            print(f"  ⚠️  警告: 文件 {file_path} 已存在，将被覆盖")

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return file_path, index
    except (IOError, OSError) as e:
        print(f"  ✗ 保存文件失败: {e}")
        raise

def get_next_id() -> int:
    """获取下一个可用的 prompt ID（基于现有文件的最大ID+1）"""
    _, existing_ids = load_existing_data()
    if not existing_ids:
        return 1
    return max(existing_ids) + 1

def main():
    parser = argparse.ArgumentParser(description='批量生成测试提示词')
    parser.add_argument('-n', '--number', type=int, default=1, help='要生成的提示词数量')
    parser.add_argument('-s', '--start', type=int, default=None, help='起始编号（如果不指定，则自动使用下一个可用编号）')
    parser.add_argument('--force', action='store_true', help='强制覆盖已存在的文件')
    args = parser.parse_args()

    # 确定起始编号
    if args.start is not None:
        start_id = args.start
        print(f"使用指定的起始编号: {start_id}")
    else:
        start_id = get_next_id()
        print(f"自动获取下一个可用编号: {start_id}")
    
    print(f'开始生成 {args.number} 个提示词...')
    if args.force:
        print(f'强制覆盖模式，编号范围: {start_id} 到 {start_id + args.number - 1}')
    else:
        print(f'起始编号: {start_id}（如遇冲突将自动顺延）')

    success_count = 0
    current_id = start_id
    for i in range(args.number):
        print(f'\n正在生成第 {i + 1}/{args.number} 个提示词 (起始ID: {current_id})...')
        try:
            data = generate_prompt()
            file_path, used_id = save_prompt_to_file(data, current_id, force=args.force)
            print(f'  ✓ 已保存到: {file_path}')
            success_count += 1
            current_id = used_id + 1

            # 添加延时，避免API请求过快
            if i < args.number - 1:
                time.sleep(CONFIG["BATCH_DELAY"])

        except Exception as e:
            print(f'  ✗ 生成失败: {e}')

    print(f'\n完成！成功生成 {success_count}/{args.number} 个提示词')

if __name__ == '__main__':
    main()
