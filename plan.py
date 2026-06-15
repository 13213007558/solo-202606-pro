#!/opt/anaconda3/envs/trae_auto/bin/python3
import json
import os
import subprocess
import sys
import time
from config_loader import get_path

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_PATH = str(get_path("paths.python_executable"))

json_path = os.path.join(BASE_DIR, "go-api.json")
with open(json_path, "r", encoding="utf-8") as f:
    api_data = json.load(f)

requirements = api_data.get("api_requirements", [])
total = len(requirements)
print(f"共读取到 {total} 个需求")

for idx, item in enumerate(requirements, 1):
    item_id = item.get("id", idx)
    title = item.get("title", "")
    description = item.get("description", "")

    if not description:
        print(f"[{idx}/{total}] id={item_id} 描述为空，跳过")
        continue

    print(f"\n{'=' * 60}")
    print(f"[{idx}/{total}] id={item_id} title={title}")
    print(f"{'=' * 60}")

    prompt_file = os.path.join(BASE_DIR, "prompt.txt")
    with open(prompt_file, "w", encoding="utf-8") as f:
        f.write(description)
    print(f"已写入 prompt.txt: {description[:80]}{'...' if len(description) > 80 else ''}")

    id_file = os.path.join(BASE_DIR, "id.txt")
    with open(id_file, "w", encoding="utf-8") as f:
        f.write(str(item_id))
    print(f"已写入 id.txt: {item_id}")

    script_path = os.path.join(BASE_DIR, "trae_automation_advanced.py")
    print(f"正在执行: {PYTHON_PATH} {script_path}")
    result = subprocess.run([PYTHON_PATH, script_path], cwd=BASE_DIR)

    if result.returncode != 0:
        print(f"⚠️ id={item_id} 执行返回非零退出码: {result.returncode}")
    else:
        print(f"✅ id={item_id} 执行完成")
        time.sleep(2)

print(f"\n{'=' * 60}")
print(f"全部执行完毕，共处理 {total} 个需求")
print(f"{'=' * 60}")
sys.exit(0)
