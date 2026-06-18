#!/usr/bin/env python3
"""
Trae Helper for Windows/macOS
配合 run_multi_round.js 获取 SessionID 和 Trace（执行轨迹）

依赖安装:
    pip install pyautogui pyperclip opencv-python Pillow

说明:
    - 本脚本通过 pyautogui 在屏幕上进行图像识别定位按钮，然后点击
    - 点击后从系统剪贴板读取内容，验证并返回 JSON
    - 使用前请确保当前目标 Trae 窗口已置顶，且截图图片与脚本在同一目录
"""

import argparse
import ctypes
import io
import json
import os
import platform
import re
import subprocess
import sys
import time

# Windows 终端默认 GBK，强制 stdout 用 UTF-8；macOS 下也保持稳定 JSON 输出。
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    import pyautogui
    import pyperclip
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Missing dependency: {e}. Run: pip install pyautogui pyperclip opencv-python Pillow"
    }, ensure_ascii=False))
    sys.exit(1)

# 启用 failsafe：鼠标移到屏幕左上角会抛出异常中断，防止失控
pyautogui.FAILSAFE = True

IS_WINDOWS = platform.system() == "Windows"
IS_MACOS = platform.system() == "Darwin"

# ---------- SessionID 正则 ----------
SESSION_ID_PATTERN = re.compile(
    r'\.(\d+):([a-f0-9]+)_([a-f0-9]+)\.([a-f0-9]+)\.([a-f0-9]+):([^.]+)\.T\(([^)]+)\)'
)
SESSION_ID_SIMPLE = re.compile(r'\b([a-f0-9]{20,32})\b', re.IGNORECASE)


def is_numlock_on():
    """检查 NumLock 是否开启 (Windows)"""
    if not IS_WINDOWS:
        return False
    return bool(ctypes.windll.user32.GetKeyState(0x90) & 1)


def ensure_numlock_off():
    """确保 NumLock 关闭"""
    if is_numlock_on():
        pyautogui.keyDown('numlock')
        pyautogui.keyUp('numlock')
        time.sleep(0.3)


def press_end():
    """滚到当前区域底部。"""
    if IS_MACOS:
        pyautogui.hotkey('command', 'down')
    else:
        pyautogui.keyDown('end')
        pyautogui.keyUp('end')
    time.sleep(0.5)


def single_click_position(x, y):
    """单击指定位置"""
    pyautogui.moveTo(x, y, duration=0.2)
    time.sleep(0.3)
    pyautogui.click(x, y)
    time.sleep(0.3)


POS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.last_sessionid_pos.json')


def save_sessionid_pos(pos):
    """保存 sessionid 按钮坐标到临时文件"""
    try:
        # pyautogui 返回的坐标是 numpy.int64，json.dump 不认识，需要转为 int
        clean_pos = {'x': int(pos['x']), 'y': int(pos['y'])}
        with open(POS_FILE, 'w', encoding='utf-8') as f:
            json.dump(clean_pos, f)
    except Exception:
        pass


def load_sessionid_pos():
    """加载上次保存的 sessionid 按钮坐标"""
    try:
        if os.path.exists(POS_FILE):
            with open(POS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return None


def close_edge():
    """关闭所有 Microsoft Edge 浏览器窗口"""
    try:
        if IS_MACOS:
            for pattern in ("Microsoft Edge", "msedge"):
                subprocess.run(
                    ['pkill', '-f', pattern],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=5
                )
        elif IS_WINDOWS:
            subprocess.run(
                ['taskkill', '/F', '/IM', 'msedge.exe'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                timeout=5
            )
    except Exception:
        pass


def recovery_action(last_click_pos):
    """
    恢复操作：单击上次位置 -> 确保 NumLock 关闭 -> 按 End
    last_click_pos: dict {'x': ..., 'y': ...} or tuple (x, y)
    """
    if last_click_pos:
        if isinstance(last_click_pos, dict):
            single_click_position(last_click_pos['x'], last_click_pos['y'])
        else:
            single_click_position(last_click_pos[0], last_click_pos[1])
    ensure_numlock_off()
    press_end()


def validate_session_id(text):
    """验证剪贴板内容是否包含有效的 SessionID"""
    if not text:
        return None
    match = SESSION_ID_PATTERN.search(text)
    if match:
        return {
            'valid': True,
            'full_id': match.group(0),
            'user_id': match.group(1),
            'trace_id': match.group(2),
            'session_id': match.group(3),
            'task_id': match.group(4),
            'message_id': match.group(5),
            'app_name': match.group(6),
            'timestamp': match.group(7),
            'format': 'full'
        }
    simple_matches = SESSION_ID_SIMPLE.findall(text)
    for sid in simple_matches:
        if len(sid) >= 20:
            return {
                'valid': True,
                'session_id': sid,
                'full_id': None,
                'format': 'simple'
            }
    return None


def locate_bottom_on_screen(image_path, confidence=0.8, region=None):
    """找屏幕上所有匹配，返回 y 坐标最大（最下面）的那个的中心坐标，或 None"""
    try:
        if region:
            all_locs = list(pyautogui.locateAllOnScreen(image_path, confidence=confidence, region=region))
        else:
            all_locs = list(pyautogui.locateAllOnScreen(image_path, confidence=confidence))
    except Exception:
        return None
    if not all_locs:
        return None
    bottom = max(all_locs, key=lambda loc: loc.top)
    center = pyautogui.center(bottom)
    return center


def locate_and_click(image_path, confidence=0.8, region=None, clicks=2):
    """
    在屏幕上定位图片并点击
    region: (left, top, width, height) 限制搜索区域
    """
    if not os.path.exists(image_path):
        return False, f"Image not found: {image_path}"

    try:
        if region:
            loc = pyautogui.locateCenterOnScreen(image_path, confidence=confidence, region=region)
        else:
            loc = pyautogui.locateCenterOnScreen(image_path, confidence=confidence)
    except Exception as e:
        import traceback
        err_detail = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
        return False, f"Locate error: {err_detail}"

    if not loc:
        return False, "Image not found on screen"

    pyautogui.moveTo(loc.x, loc.y, duration=0.2)
    time.sleep(0.3)

    if clicks == 2:
        pyautogui.doubleClick(loc.x, loc.y)
    else:
        for i in range(clicks):
            pyautogui.click(loc.x, loc.y)
            if i < clicks - 1:
                time.sleep(0.3)
    return True, {"x": loc.x, "y": loc.y}


def scroll_up_chat(pos, scroll_amount=5):
    """在指定位置点击聚焦对话框，然后鼠标滚轮向上滚动"""
    x = pos['x'] if isinstance(pos, dict) else pos[0]
    y = pos['y'] if isinstance(pos, dict) else pos[1]
    pyautogui.click(x, y)
    time.sleep(0.5)
    pyautogui.scroll(scroll_amount, x, y)
    time.sleep(1)


def click_at_pos_and_verify(pos, clicks, verify_timeout):
    """在指定坐标点击并验证剪贴板是否获取到有效 SessionID"""
    x = pos['x'] if isinstance(pos, dict) else pos[0]
    y = pos['y'] if isinstance(pos, dict) else pos[1]

    pyperclip.copy("")
    time.sleep(0.3)

    pyautogui.moveTo(x, y, duration=0.2)
    time.sleep(0.3)

    if clicks == 2:
        pyautogui.doubleClick(x, y)
    else:
        for i in range(clicks):
            pyautogui.click(x, y)
            if i < clicks - 1:
                time.sleep(0.3)

    time.sleep(2)

    for v in range(1, verify_timeout + 1):
        time.sleep(1)
        content = pyperclip.paste()
        if content:
            validated = validate_session_id(content)
            if validated:
                return validated
    return None


def action_sessionid(args):
    """获取 SessionID：极速检测 + fallback（滚轮上翻 + 坐标单击）"""
    def verbose_print(msg):
        if args.verbose:
            print(msg)

    verbose_print(f"[DEBUG] 等待 {args.wait} 秒后开始...")
    time.sleep(args.wait)

    ensure_numlock_off()
    pyperclip.copy("")
    time.sleep(0.1)

    # 第一次：极速检测 + 立即双击（取最下面的按钮）
    verbose_print("[DEBUG] 第一次快速检测...")
    loc = locate_bottom_on_screen(args.image, confidence=args.confidence)

    if loc:
        verbose_print(f"[DEBUG] 找到 sessionid_button @ ({loc.x}, {loc.y})，立即双击")
        pyautogui.doubleClick(loc.x, loc.y)
        save_sessionid_pos({'x': int(loc.x), 'y': int(loc.y)})
        time.sleep(1)
        for v in range(1, args.verify_timeout + 1):
            time.sleep(0.5)
            content = pyperclip.paste()
            if content:
                validated = validate_session_id(content)
                if validated:
                    verbose_print("[DEBUG] SessionID 第一次检测成功")
                    return {"success": True, "data": validated}

    # fallback
    fallback_x = getattr(args, 'fallback_x', None)
    fallback_y = getattr(args, 'fallback_y', None)
    last_sid_pos = load_sessionid_pos()

    if fallback_x is None or fallback_y is None:
        verbose_print("[DEBUG] 无 fallback 坐标，直接返回失败")
        return {"success": False, "error": "First detection failed, no fallback position"}

    verbose_print(f"[DEBUG] 开始 fallback：聚焦 ({fallback_x}, {fallback_y}) + 滚轮上翻")
    fallback_start = time.time()
    scroll_round = 0

    while (time.time() - fallback_start) < 10:
        scroll_round += 1
        scroll_amount = 20 + (scroll_round - 1) * 5

        # 单击聚焦对话区
        pyautogui.click(fallback_x, fallback_y)
        time.sleep(0.2)

        # 滚轮向上
        pyautogui.scroll(scroll_amount, fallback_x, fallback_y)
        verbose_print(f"[DEBUG] fallback 第 {scroll_round} 轮：向上滚动 {scroll_amount} 格")
        time.sleep(0.5)

        # 先单击上次存储的 sessionid 坐标位置
        if last_sid_pos:
            pyautogui.click(last_sid_pos['x'], last_sid_pos['y'])
            time.sleep(0.2)

        # 检测 sessionid_button.png（取最下面的）
        pyperclip.copy("")
        conf = max(0.5, args.confidence - scroll_round * 0.05)
        loc2 = locate_bottom_on_screen(args.image, confidence=conf)

        if loc2:
            verbose_print(f"[DEBUG] fallback 找到 @ ({loc2.x}, {loc2.y})，立即双击")
            pyautogui.doubleClick(loc2.x, loc2.y)
            save_sessionid_pos({'x': int(loc2.x), 'y': int(loc2.y)})
            last_sid_pos = {'x': int(loc2.x), 'y': int(loc2.y)}
            time.sleep(1)
            for v in range(1, args.verify_timeout + 1):
                if (time.time() - fallback_start) >= 10:
                    break
                time.sleep(0.5)
                content = pyperclip.paste()
                if content:
                    validated = validate_session_id(content)
                    if validated:
                        verbose_print("[DEBUG] SessionID fallback 成功")
                        return {"success": True, "data": validated}

    verbose_print("[DEBUG] fallback 超时 10s，返回失败")
    return {"success": False, "error": "Failed to get session id (fallback timeout 10s)"}


def action_trace(args):
    """获取执行轨迹（trace）
    策略：
      1. 先找 finish_all.png，在其区域范围内找 finish.png
      2. 找不到：点击 sessionid 坐标聚焦 -> 关 NumLock -> 按 Enter -> 重新找 finish_all.png -> 区域内找 finish.png
    """
    def verbose_print(msg):
        if args.verbose:
            print(msg)

    def find_finish_in_region(all_loc, conf):
        """在 finish_all.png 区域内搜索 finish.png，返回最下面的 location 或 None"""
        if not all_loc:
            return None
        region = (
            max(0, all_loc.left - 50),
            max(0, all_loc.top - 30),
            all_loc.width + 100,
            all_loc.height + 60
        )
        return locate_bottom_on_screen(args.finish_image, confidence=conf, region=region)

    def click_and_get_trace(loc):
        """点击指定位置并读取剪贴板，返回 (success, content)"""
        pyperclip.copy("")
        time.sleep(0.5)
        pyautogui.moveTo(loc.x, loc.y, duration=0.2)
        time.sleep(0.3)

        if args.clicks == 2:
            pyautogui.doubleClick(loc.x, loc.y)
        else:
            for i in range(args.clicks):
                pyautogui.click(loc.x, loc.y)
                if i < args.clicks - 1:
                    time.sleep(0.3)

        verbose_print("[DEBUG] 已点击，等待应用写入剪贴板...")
        time.sleep(2)

        for v in range(1, args.verify_timeout + 1):
            time.sleep(1)
            content = pyperclip.paste()
            verbose_print(f"[DEBUG] 验证 {v}/{args.verify_timeout}: 剪贴板长度={len(content) if content else 0}")
            if content and len(content) > 10:
                return True, content
        return False, None

    sessionid_pos = load_sessionid_pos()
    verbose_print(f"[DEBUG] 加载 sessionid 坐标: {sessionid_pos}")

    for attempt in range(1, 4):
        conf = max(0.5, args.confidence - (attempt - 1) * 0.1)
        verbose_print(f"[DEBUG] 第 {attempt} 次尝试，置信度={conf}")

        # 步骤1：找 finish_all.png（取最下面的）
        all_loc = None
        try:
            all_locs = list(pyautogui.locateAllOnScreen(args.all_image, confidence=conf))
            if all_locs:
                all_loc = max(all_locs, key=lambda loc: loc.top)
        except Exception:
            all_loc = None

        if all_loc:
            verbose_print(f"[DEBUG] 找到 finish_all.png: left={all_loc.left}, top={all_loc.top}, size=({all_loc.width}, {all_loc.height})")
        else:
            verbose_print("[DEBUG] 未找到 finish_all.png")

        # 步骤2：在 finish_all.png 区域（或附近）找 finish.png
        finish_loc = find_finish_in_region(all_loc, conf) if all_loc else None

        if finish_loc:
            verbose_print(f"[DEBUG] 在区域内找到 finish.png: ({finish_loc.x}, {finish_loc.y})")
            ok, content = click_and_get_trace(finish_loc)
            if ok:
                verbose_print("[DEBUG] 获取 trace 成功，关闭 Edge...")
                close_edge()
                return {"success": True, "data": content}
            verbose_print("[DEBUG] 点击后未获取到有效 trace")
        else:
            verbose_print("[DEBUG] 未在 finish_all.png 区域内找到 finish.png")

        # 步骤3：如果没找到或验证失败，执行恢复操作
        if attempt < 3:
            verbose_print("[DEBUG] 执行恢复操作...")
            if sessionid_pos:
                verbose_print(f"[DEBUG] 点击 sessionid 坐标聚焦聊天区: ({sessionid_pos['x']}, {sessionid_pos['y']})")
                pyautogui.moveTo(sessionid_pos['x'], sessionid_pos['y'], duration=0.2)
                time.sleep(0.3)
                pyautogui.click(sessionid_pos['x'], sessionid_pos['y'])
                time.sleep(0.5)
            ensure_numlock_off()
            verbose_print("[DEBUG] 按 Enter 向下滚动...")
            pyautogui.keyDown('return')
            pyautogui.keyUp('return')
            time.sleep(0.5)
            verbose_print("[DEBUG] 恢复操作完成，等待 2 秒后继续搜索...")
            time.sleep(2)

    return {"success": False, "error": "Finish button not found after all attempts"}


def action_click(args):
    """定位并点击指定图片，返回坐标"""
    ok, info = locate_and_click(args.image, confidence=args.confidence, clicks=args.clicks)
    if ok and isinstance(info, dict):
        return {"success": True, "data": info}
    return {"success": False, "error": info}


def action_drag(args):
    """检测图片位置并拖拽，返回原始坐标"""
    image_path = args.image
    distance = args.distance
    direction = args.direction

    if not os.path.exists(image_path):
        return {"success": False, "error": f"Image not found: {image_path}"}

    loc = None
    for conf in [0.8, 0.6]:
        try:
            loc = pyautogui.locateCenterOnScreen(image_path, confidence=conf)
        except Exception:
            continue
        if loc:
            break

    if not loc:
        return {"success": False, "error": "Image not found on screen"}

    start_x, start_y = int(loc.x), int(loc.y)

    if direction == 'right':
        end_x, end_y = start_x + distance, start_y
    elif direction == 'left':
        end_x, end_y = start_x - distance, start_y
    elif direction == 'up':
        end_x, end_y = start_x, start_y - distance
    else:
        end_x, end_y = start_x, start_y + distance

    pyautogui.moveTo(start_x, start_y, duration=0.2)
    time.sleep(0.1)
    pyautogui.mouseDown(button='left')
    time.sleep(0.1)
    pyautogui.moveTo(end_x, end_y, duration=0.5)
    time.sleep(0.1)
    pyautogui.mouseUp(button='left')
    time.sleep(0.3)

    return {"success": True, "data": {"x": start_x, "y": start_y}}


def action_scroll(args):
    """在指定坐标单击聚焦，然后模拟滚轮滚动"""
    x = args.scroll_x
    y = args.scroll_y
    if x is None or y is None:
        return {"success": False, "error": "Missing --scroll-x or --scroll-y"}

    pyautogui.click(x, y)
    time.sleep(0.3)

    scroll_amount = args.distance // 100
    if scroll_amount < 1:
        scroll_amount = 1

    if args.direction in ('up',):
        pyautogui.scroll(scroll_amount, x, y)
    else:
        pyautogui.scroll(-scroll_amount, x, y)
    time.sleep(0.5)

    return {"success": True, "data": {"x": x, "y": y, "scrolled": scroll_amount}}


def main():
    parser = argparse.ArgumentParser(description="Trae cross-platform helper")
    parser.add_argument("--action", required=True, choices=["sessionid", "trace", "click", "drag", "scroll"])
    parser.add_argument("--image", default="images/sessionid_button.png", help="SessionID 按钮截图路径")
    parser.add_argument("--all-image", default="images/finish_all.png", help="区域定位参考图路径")
    parser.add_argument("--finish-image", default="images/finish.png", help="Finish 按钮截图路径")
    parser.add_argument("--task-finish-image", default="images/task_finish.png", help="任务完成标识截图路径（可选）")
    parser.add_argument("--confidence", type=float, default=0.8, help="图像识别置信度")
    parser.add_argument("--wait", type=int, default=5, help="SessionID 模式：发送后等待秒数")
    parser.add_argument("--max-wait", type=int, default=60, help="Trace 模式：最大等待秒数")
    parser.add_argument("--max-attempts", type=int, default=3, help="SessionID 模式：最大尝试次数")
    parser.add_argument("--retry-interval", type=int, default=2, help="重试间隔秒数")
    parser.add_argument("--clicks", type=int, default=2, help="点击次数（默认双击）")
    parser.add_argument("--verify-timeout", type=int, default=3, help="点击后验证剪贴板的轮询次数")
    parser.add_argument("--check-interval", type=int, default=5, help="Trace 模式：轮询检测间隔秒数")
    parser.add_argument("--verbose", action="store_true", help="输出详细调试日志")
    parser.add_argument("--direction", default="right", choices=["left", "right", "up", "down"], help="Drag 模式：拖拽方向")
    parser.add_argument("--distance", type=int, default=9999, help="Drag 模式：拖拽距离（像素）")
    parser.add_argument("--fallback-x", type=int, default=None, help="SessionID 模式：fallback 单击 X 坐标")
    parser.add_argument("--fallback-y", type=int, default=None, help="SessionID 模式：fallback 单击 Y 坐标")
    parser.add_argument("--scroll-x", type=int, default=None, help="Scroll 模式：单击聚焦 X 坐标")
    parser.add_argument("--scroll-y", type=int, default=None, help="Scroll 模式：单击聚焦 Y 坐标")

    args = parser.parse_args()

    try:
        if args.action == "sessionid":
            result = action_sessionid(args)
        elif args.action == "click":
            result = action_click(args)
        elif args.action == "drag":
            result = action_drag(args)
        elif args.action == "scroll":
            result = action_scroll(args)
        else:
            result = action_trace(args)
    except Exception as e:
        result = {"success": False, "error": f"Internal error: {e}"}

    # 只输出 JSON，方便 run_multi_round.js 解析
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Fatal error: {e}"}, ensure_ascii=False))
        sys.exit(0)
