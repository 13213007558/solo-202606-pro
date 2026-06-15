#!/usr/bin/env python3
"""
测试脚本：识别 shuxian.png（Trae IDE 对话框与代码区分割线），然后长按拖拽向右移动 2000px
运行后有 3 秒倒计时，方便切换到 Trae 窗口
"""

import os
import sys
import time
import json

try:
    import pyautogui
except ImportError:
    print("请先安装依赖: pip install pyautogui opencv-python Pillow")
    sys.exit(1)

pyautogui.FAILSAFE = True

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_PATH = os.path.join(SCRIPT_DIR, '..', 'images', 'shuxian.png')
DRAG_DISTANCE = 2000


def main():
    if not os.path.exists(IMAGE_PATH):
        print(f"错误: 找不到图片 {IMAGE_PATH}")
        sys.exit(1)

    # 3 秒倒计时
    print("3 秒后开始检测，请切换到 Trae 窗口...")
    for i in range(3, 0, -1):
        print(f"  {i}...")
        time.sleep(1)
    print("开始检测 shuxian.png ...")

    # 尝试多个置信度，分割线比较细，可能需要较低置信度
    loc = None
    for conf in [0.8, 0.7, 0.6, 0.5]:
        print(f"  置信度 {conf} 搜索中...")
        try:
            loc = pyautogui.locateCenterOnScreen(IMAGE_PATH, confidence=conf)
        except Exception as e:
            print(f"  搜索异常: {e}")
            continue
        if loc:
            print(f"  找到! 置信度={conf}, 坐标=({loc.x}, {loc.y})")
            break

    if not loc:
        print("未在屏幕上找到 shuxian.png，请确认 Trae 窗口已打开且分割线可见")
        sys.exit(1)

    start_x, start_y = int(loc.x), int(loc.y)
    end_x = start_x + DRAG_DISTANCE

    print(f"准备拖拽: ({start_x}, {start_y}) -> ({end_x}, {start_y}), 距离={DRAG_DISTANCE}px")

    # 移动到分割线位置
    pyautogui.moveTo(start_x, start_y, duration=0.3)
    time.sleep(0.3)

    # 长按并向右拖拽
    pyautogui.mouseDown(button='left')
    time.sleep(0.1)
    pyautogui.moveTo(end_x, start_y, duration=0.8)
    time.sleep(0.1)
    pyautogui.mouseUp(button='left')

    print(f"拖拽完成! 分割线已从 x={start_x} 移动到 x={end_x}")


if __name__ == "__main__":
    main()
