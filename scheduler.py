import sys
import os
import time
import subprocess
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def parse_time(time_str):
    parts = time_str.strip().split(':')
    if len(parts) != 2:
        raise ValueError("时间格式必须是 HH:MM，例如 20:24")
    h, m = map(int, parts)
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise ValueError("小时必须在 0-23 之间，分钟必须在 0-59 之间")
    return h, m


def get_next_target(h, m):
    now = datetime.now()
    target = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return target


def main():
    if len(sys.argv) > 1:
        time_str = sys.argv[1]
    else:
        time_str = "00:00"

    h, m = parse_time(time_str)
    target = get_next_target(h, m)

    print(f"[Scheduler] 定时任务已设置")
    print(f"[Scheduler] 目标时间: {target.strftime('%Y-%m-%d %H:%M')}")
    print(f"[Scheduler] 等待中... 按 Ctrl+C 取消")

    while True:
        now = datetime.now()
        if now >= target:
            break
        remaining = (target - now).total_seconds()
        if int(remaining) % 60 == 0:
            mins = int(remaining // 60)
            print(f"[Scheduler] 还剩 {mins} 分钟...")
        time.sleep(1)

    print("[Scheduler] 时间到！启动 run_auto.bat ...")

    proc = subprocess.Popen(
        ['cmd', '/c', 'run_auto.bat'],
        cwd=SCRIPT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace'
    )

    for line in proc.stdout:
        print(line, end='')

    proc.wait()
    print(f"[Scheduler] run_auto.bat 已结束，返回码: {proc.returncode}")


if __name__ == '__main__':
    main()
