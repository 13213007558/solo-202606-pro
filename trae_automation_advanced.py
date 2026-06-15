#!/opt/anaconda3/envs/trae_auto/bin/python3
"""
Trae软件高级自动化测试脚本
功能：打开Trae软件，在@SOLO Coder输入框写入提示词并运行
使用AppleScript + pyautogui结合的方式，更加稳定可靠
"""

import subprocess
import time
import sys
import json
import os
import re
import shutil

try:
    import pyautogui
except ImportError:
    print("错误：需要安装pyautogui库")
    print("请运行：pip3 install pyautogui opencv-python")
    sys.exit(1)

try:
    from Quartz import (
        CGEventCreateMouseEvent, CGEventPost, CGEventSetIntegerValueField,
        kCGEventLeftMouseDown, kCGEventLeftMouseUp, kCGMouseButtonLeft,
        kCGHIDEventTap, kCGMouseEventClickState
    )
    QUARTZ_AVAILABLE = True
except ImportError:
    QUARTZ_AVAILABLE = False

# 配置文件路径
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'trae_config.json')

# 默认配置
DEFAULT_CONFIG = {
    "app_name": "TRAE CN",
    "wait_time": 2,
    "startup_wait_time": 40,
    "input_box_coordinates": None,
    "run_button_coordinates": None,
    "input_box_image": "images/input.png",
    "input_box_confidence": 0.8,
    "input_box_max_attempts": 3,
    "run_button_image": "images/submit.png",
    "run_button_confidence": 0.8,
    "run_button_max_attempts": 3,
    "delete_task_image": "images/delete_task.png",
    "delete_task_confidence": 0.8,
    "delete_task_max_attempts": 3,
    "delete_image": "images/delete.png",
    "delete_confidence": 0.8,
    "delete_max_attempts": 3,
    "close_windows_image": "images/close_windows.png",
    "close_windows_confidence": 0.8,
    "close_windows_max_attempts": 10,
    "close_windows_click_interval": 1,
    "default_prompt": "请帮我写一个Hello World程序",
    "use_enter_to_run": False,
    "window_position": None,
    "session_id_wait_time": 5,
    "session_id_button_image": "images/sessionid_button.png",
    "session_id_confidence": 0.8,
    "session_id_max_attempts": 3,
    "session_id_retry_interval": 2,
    "session_id_click_count": 2,
    "session_id_click_interval": 0.3,
    "session_id_verify_timeout": 5,
    "finish_button_image": "images/finish.png",
    "finish_button_all_image": "images/finish_all.png",
    "finish_button_confidence": 0.8,
    "finish_button_all_confidence": 0.8,
    "task_finish_image": "images/task_finish.png",
    "task_finish_confidence": 0.8,
    "finish_button_max_wait": 600,
    "finish_button_check_interval": 5,
    "finish_button_click_count": 2,
    "finish_button_click_interval": 0.3,
    "finish_button_verify_timeout": 5,
    "output_file": "trae_results.json",
    "log_scroll_coordinates": [590, 355],
    "save_all_image": "images/save_all.png",
    "save_all_confidence": 0.8,
    "runing_image": "images/runing.png",
    "runing_confidence": 0.8,
    "delete_file_image": "images/delete_file.png",
    "delete_file_confidence": 0.8,
    "deletefile_confirm_image": "images/deletefile_confirm.png",
    "deletefile_confirm_confidence": 0.8,
    "delete_file_confirm_delay": 1.0,
    "edit_image": "images/edit.png",
    "edit_confidence": 0.8,
    "edit_max_attempts": 3,
    "noclick_images": [
        {"image": "images/noclick1.png", "confidence": 0.8, "mode": "proximity"},
        {"image": "images/noclick2.png", "confidence": 0.8, "mode": "height"}
    ],
    "noclick_proximity": 150,
    "solo_coder_dir": "/Users/zhangyuqing/Desktop/solo-coder",
    "find_history_task_image": "images/find_history_task.png",
    "find_history_task_confidence": 0.8,
    "find_history_task_max_attempts": 3,
    "find_history_task_coordinates": [168, 150],
    "submit_answer_image": "images/submit_answer.png",
    "submit_answer_confidence": 0.8,
    "next_image": "images/next.png",
    "next_confidence": 0.8,
    "open_dir_coordinates": [244, 21],
    "open_dir_image": "images/open_dir.png",
    "open_dir_confidence": 0.8,
    "open_dir_max_attempts": 3,
    "image_dir_image": "images/image_dir.png",
    "image_dir_confidence": 0.7,
    "image_dir_max_attempts": 5,
    "image_dir_coordinates": None,
    "new_dir_image": "images/new_dir.png",
    "new_dir_confidence": 0.8,
    "new_dir_max_attempts": 3,
    "create_dir_image": "images/create_dir.png",
    "create_dir_confidence": 0.8,
    "create_dir_max_attempts": 3,
    "open_dir_os_image": "images/open_dir_os.png",
    "open_dir_os_confidence": 0.8,
    "open_dir_os_max_attempts": 3,
    "open_dir_reload_wait": 15
}

def read_task_id():
    """从 id.txt 读取当前任务ID，读取失败则用时间戳"""
    id_file = os.path.join(os.path.dirname(__file__), 'id.txt')
    try:
        if os.path.exists(id_file):
            with open(id_file, 'r', encoding='utf-8') as f:
                task_id = f.read().strip()
                if task_id:
                    print(f"📋 从 id.txt 读取到任务ID: {task_id}")
                    return task_id
    except Exception as e:
        print(f"⚠️ 读取 id.txt 失败: {e}")
    fallback = time.strftime("%Y%m%d%H%M%S")
    print(f"⚠️ id.txt 不可用，使用时间戳: {fallback}")
    return fallback

def load_config():
    """加载配置文件"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # 合并默认配置
                result = DEFAULT_CONFIG.copy()
                result.update(config)
                return result
        except Exception as e:
            print(f"加载配置文件失败: {e}，使用默认配置")
            return DEFAULT_CONFIG
    else:
        # 创建默认配置文件
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG

def save_config(config):
    """保存配置文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
        print(f"配置文件已保存到: {CONFIG_FILE}")
    except Exception as e:
        print(f"保存配置文件失败: {e}")

def run_applescript(script):
    """运行AppleScript"""
    try:
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"AppleScript执行失败: {e.stderr}")
        return None

def open_trae_app(config):
    """打开Trae应用，优化处理包含空格的应用名称"""
    app_name = config['app_name']
    print(f"正在打开 {app_name} 应用...")
    
    # 方法1：直接使用subprocess运行open命令，这是最可靠的方法
    # 因为subprocess会自动处理参数中的空格和特殊字符
    try:
        result = subprocess.run(
            ['open', '-a', app_name],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            # 等待应用启动
            wait_time = config['wait_time']
            time.sleep(wait_time * 3)
            print(f"{app_name} 应用已启动")
            return True
        else:
            print(f"open命令失败: {result.stderr}")
            # 尝试方法2
    except Exception as e:
        print(f"open命令执行出错: {e}")
        # 尝试方法2
    
    # 方法2：使用AppleScript，但正确处理包含空格的应用名称
    print("尝试使用AppleScript打开应用...")
    
    # 使用quoted form of来正确处理应用名称中的空格和特殊字符
    script = f'''
    set appName to "{app_name}"
    tell application appName to activate
    '''
    
    try:
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            wait_time = config['wait_time']
            time.sleep(wait_time * 3)
            print(f"{app_name} 应用已启动")
            return True
        else:
            print(f"AppleScript失败: {result.stderr}")
    except Exception as e:
        print(f"AppleScript执行出错: {e}")
    
    print(f"无法打开 {app_name} 应用，请检查应用是否正确安装")
    return False

def is_app_running(app_name):
    """检查应用是否正在运行"""
    script = f'''
    tell application "System Events"
        set isRunning to (name of processes) contains "{app_name}"
    end tell
    return isRunning
    '''
    result = run_applescript(script)
    return result == 'true'

def close_extra_windows(config):
    """关闭多余窗口，只保留一个Trae窗口"""
    app_name = config['app_name']
    
    script = f'''
    tell application "System Events"
        tell process "{app_name}"
            set windowCount to count of windows
            return windowCount
        end tell
    end tell
    '''
    result = run_applescript(script)
    
    if result is None:
        print(f"   ⚠️ 无法获取窗口数量")
        return
    
    try:
        window_count = int(result)
    except ValueError:
        print(f"   ⚠️ 窗口数量解析失败: {result}")
        return
    
    print(f"   当前 {app_name} 窗口数量: {window_count}")
    
    if window_count <= 1:
        print(f"   ✅ 只有1个窗口，无需关闭")
        return
    
    print(f"   发现 {window_count} 个窗口，关闭多余的 {window_count - 1} 个...")
    
    for i in range(window_count - 1):
        close_script = f'''
        tell application "System Events"
            tell process "{app_name}"
                set windowCount to count of windows
                if windowCount > 1 then
                    set lastIndex to windowCount
                    click button 1 of window lastIndex
                end if
            end tell
        end tell
        '''
        close_result = run_applescript(close_script)
        if close_result is not None:
            print(f"   ✅ 已关闭第 {i + 1} 个多余窗口")
        else:
            print(f"   ⚠️ 关闭窗口失败，尝试快捷键方式...")
            close_script2 = f'''
            tell application "System Events"
                tell process "{app_name}"
                    set windowCount to count of windows
                    if windowCount > 1 then
                        set lastIndex to windowCount
                        perform action "AXClose" of window lastIndex
                    end if
                end tell
            end tell
            '''
            close_result2 = run_applescript(close_script2)
            if close_result2 is not None:
                print(f"   ✅ 已通过AXClose关闭第 {i + 1} 个多余窗口")
            else:
                print(f"   ⚠️ AXClose也失败，尝试 Command+W...")
                pyautogui.hotkey('command', 'w')
        
        time.sleep(1)
    
    verify_script = f'''
    tell application "System Events"
        tell process "{app_name}"
            set windowCount to count of windows
            return windowCount
        end tell
    end tell
    '''
    verify_result = run_applescript(verify_script)
    try:
        remaining = int(verify_result)
        if remaining <= 1:
            print(f"   ✅ 现在只剩 {remaining} 个窗口")
        else:
            print(f"   ⚠️ 还有 {remaining} 个窗口")
    except (ValueError, TypeError):
        pass

def bring_window_to_front(config):
    """将Trae窗口带到前台"""
    app_name = config['app_name']
    print(f"正在将 {app_name} 窗口带到前台...")
    
    script = f'''
    tell application "{app_name}"
        activate
    end tell
    '''
    run_applescript(script)
    time.sleep(config['wait_time'])
    
    # 尝试使用System Events来确保窗口在前台
    script = f'''
    tell application "System Events"
        tell process "{app_name}"
            set frontmost to true
        end tell
    end tell
    '''
    run_applescript(script)
    time.sleep(0.5)
    return True

def click_at_position(x, y, config):
    """点击指定坐标"""
    print(f"点击坐标: ({x}, {y})")
    pyautogui.click(x, y)
    time.sleep(config['wait_time'])

def double_click_at_position(x, y):
    """使用Quartz Event Services在指定坐标执行真正的macOS双击"""
    if QUARTZ_AVAILABLE:
        try:
            event1 = CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, (x, y), kCGMouseButtonLeft)
            CGEventSetIntegerValueField(event1, kCGMouseEventClickState, 1)
            event2 = CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, (x, y), kCGMouseButtonLeft)
            CGEventSetIntegerValueField(event2, kCGMouseEventClickState, 1)
            event3 = CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, (x, y), kCGMouseButtonLeft)
            CGEventSetIntegerValueField(event3, kCGMouseEventClickState, 2)
            event4 = CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, (x, y), kCGMouseButtonLeft)
            CGEventSetIntegerValueField(event4, kCGMouseEventClickState, 2)
            CGEventPost(kCGHIDEventTap, event1)
            CGEventPost(kCGHIDEventTap, event2)
            CGEventPost(kCGHIDEventTap, event3)
            CGEventPost(kCGHIDEventTap, event4)
            return True
        except Exception as e:
            print(f"   ⚠️ Quartz双击失败: {e}，尝试AppleScript方式...")
    script = f'''
    tell application "System Events"
        click at {{x, y}}
        delay 0.05
        click at {{x, y}}
    end tell
    '''
    script = script.replace('{{x, y}}', f'{{{x}, {y}}}')
    result = run_applescript(script)
    return result is not None

def triple_click_at_position(x, y):
    """使用AppleScript在指定坐标执行三击（macOS更可靠）"""
    script = f'''
    tell application "System Events"
        click at {{x, y}}
        delay 0.1
        click at {{x, y}}
        delay 0.1
        click at {{x, y}}
    end tell
    '''
    script = script.replace('{{x, y}}', f'{{{x}, {y}}}')
    result = run_applescript(script)
    return result is not None

def click_button_by_image(image_path, confidence=0.8):
    """通过图片识别按钮并点击"""
    try:
        # confidence 需要安装 opencv-python: pip install opencv-python
        location = pyautogui.locateCenterOnScreen(image_path, confidence=confidence)
        if location:
            print(f"找到按钮图标，坐标: {location}")
            pyautogui.click(location)
            return True
        else:
            print("未在屏幕上找到按钮图标")
            return False
    except Exception as e:
        print(f"图像识别出错: {e}")
        return False

def copy_to_clipboard(text):
    """将文本复制到剪贴板（支持中文）"""
    try:
        # 方法1：使用 pyperclip 库（如果已安装）
        import pyperclip
        pyperclip.copy(text)
        return True
    except ImportError:
        pass
    
    try:
        # 方法2：使用 macOS 的 pbcopy 命令
        # 使用 subprocess 并正确处理中文编码
        result = subprocess.run(
            ['pbcopy'],
            input=text.encode('utf-8'),
            capture_output=True
        )
        if result.returncode == 0:
            return True
    except Exception as e:
        print(f"使用 pbcopy 复制失败: {e}")
    
    try:
        # 方法3：使用 AppleScript 设置剪贴板
        # 对文本中的特殊字符进行转义
        escaped_text = text.replace('"', '\\"').replace('\\', '\\\\')
        script = f'''
        set the clipboard to "{escaped_text}"
        '''
        result = run_applescript(script)
        if result is not None:
            return True
    except Exception as e:
        print(f"使用 AppleScript 复制失败: {e}")
    
    return False

def get_from_clipboard():
    """
    从剪贴板读取文本内容
    返回读取到的文本，如果失败返回None
    """
    try:
        # 方法1：使用 pyperclip 库（如果已安装）
        import pyperclip
        text = pyperclip.paste()
        return text
    except ImportError:
        pass
    
    try:
        # 方法2：使用 macOS 的 pbpaste 命令
        result = subprocess.run(
            ['pbpaste'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout
    except Exception as e:
        print(f"使用 pbpaste 读取失败: {e}")
    
    try:
        # 方法3：使用 AppleScript 读取剪贴板
        script = '''
        return (the clipboard) as text
        '''
        result = run_applescript(script)
        if result is not None:
            return result
    except Exception as e:
        print(f"使用 AppleScript 读取失败: {e}")
    
    return None

def clear_clipboard():
    """
    清空剪贴板内容
    """
    try:
        # 使用 pbcopy 清空剪贴板
        result = subprocess.run(
            ['pbcopy'],
            input=b'',
            capture_output=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"清空剪贴板失败: {e}")
        return False

# SessionID 格式的正则表达式
# 完整格式：.user_id:trace_id_session_id.task_id.message_id:app_name.T(timestamp)
SESSION_ID_PATTERN = re.compile(
    r'\.(\d+):([a-f0-9]+)_([a-f0-9]+)\.([a-f0-9]+)\.([a-f0-9]+):([^.]+)\.T\(([^)]+)\)'
)

# 简化的 session_id 匹配（只匹配会话ID部分，通常是24-32位的十六进制字符串）
SESSION_ID_SIMPLE = re.compile(r'\b([a-f0-9]{20,32})\b', re.IGNORECASE)

def validate_session_id(text):
    """
    验证文本中是否包含有效的SessionID
    
    Args:
        text: 要验证的文本
        
    Returns:
        dict: 如果找到有效的SessionID，返回包含session_id的字典
              如果没有找到，返回None
    """
    if not text:
        return None
    
    # 首先尝试匹配完整格式
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
    
    # 如果没有找到完整格式，尝试匹配简单的十六进制ID
    simple_matches = SESSION_ID_SIMPLE.findall(text)
    if simple_matches:
        # 返回第一个匹配到的有效长度的ID
        for session_id in simple_matches:
            if len(session_id) >= 20:  # 确保ID长度足够
                return {
                    'valid': True,
                    'session_id': session_id,
                    'full_id': None,
                    'format': 'simple'
                }
    
    return None

def type_text(text, config):
    """输入文本（支持中文，使用剪贴板粘贴方式）"""
    print(f"正在输入文本: {text[:50]}{'...' if len(text) > 50 else ''}")
    
    # 先全选清除现有内容
    pyautogui.hotkey('command', 'a')
    time.sleep(0.3)
    
    # 方法1：尝试使用剪贴板粘贴（支持中文）
    print("  尝试使用剪贴板粘贴方式（支持中文）...")
    if copy_to_clipboard(text):
        # 粘贴文本
        pyautogui.hotkey('command', 'v')
        time.sleep(config['wait_time'])
        print("文本输入完成（使用粘贴方式）")
        return
    else:
        print("  剪贴板方式失败，尝试备用方法...")
    
    # 方法2：备用方法 - 尝试直接输入（仅支持英文）
    print("  警告：使用备用方法，可能无法正确输入中文")
    pyautogui.typewrite(text, interval=0.02)
    time.sleep(config['wait_time'])
    print("文本输入完成（使用直接输入方式，可能不支持中文）")

def run_prompt_action(config):
    """运行提示词"""
    print("正在运行提示词...")
    
    # 检查是否使用回车键运行（向后兼容）
    if config.get('use_enter_to_run', False):
        # 按回车键运行
        print("使用回车键运行...")
        pyautogui.press('enter')
        time.sleep(config['wait_time'])
        print("提示词已发送运行（回车键）")
        return
    
    # 优先使用图片定位点击运行按钮
    print("尝试使用图片定位点击运行按钮...")
    run_success, run_coords = click_run_button_by_image(config)
    
    if run_success:
        print(f"✅ 运行按钮点击成功！坐标: {run_coords}")
    else:
        # 图片定位失败，尝试使用备用坐标
        fallback_coords = config.get('run_button_coordinates')
        if fallback_coords and len(fallback_coords) == 2:
            print(f"\n💡 使用备用坐标点击运行按钮: {fallback_coords}")
            click_at_position(fallback_coords[0], fallback_coords[1], config)
        else:
            print("\n⚠️ 运行按钮定位失败！")
            print("提示词可能未成功发送运行")
    
    time.sleep(config['wait_time'])
    print("提示词运行操作完成")

def get_image_path(config, config_key, default_filename):
    """
    通用的图片路径获取函数
    
    Args:
        config: 配置对象
        config_key: 配置文件中图片文件名的键名
        default_filename: 默认的图片文件名
    
    Returns:
        str: 图片的完整路径
    """
    image_name = config.get(config_key, default_filename)
    if os.path.isabs(image_name):
        return image_name
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def get_input_box_image_path(config):
    """获取输入框图片的完整路径"""
    image_name = config.get('input_box_image', 'images/input.png')
    if os.path.isabs(image_name):
        return image_name
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def get_run_button_image_path(config):
    """获取运行按钮图片的完整路径"""
    image_name = config.get('run_button_image', 'images/submit.png')
    if os.path.isabs(image_name):
        return image_name
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def locate_and_click_by_image(image_path, base_confidence=0.8, max_attempts=3, 
                                retry_interval=2, click_count=1, click_interval=0.3,
                                fallback_coords=None, config=None):
    """
    通用的图片定位并点击函数
    
    Args:
        image_path: 图片路径
        base_confidence: 基础置信度
        max_attempts: 最大尝试次数
        retry_interval: 重试间隔（秒）
        click_count: 点击次数
        click_interval: 点击间隔（秒）
        fallback_coords: 备用坐标（图片定位失败时使用）
        config: 配置对象（用于日志记录）
    
    Returns:
        tuple: (是否成功, 坐标或None)
    """
    print(f"\n{'=' * 60}")
    print(f"尝试通过图片定位并点击: {os.path.basename(image_path)}")
    print(f"{'=' * 60}")
    
    # 检查图片文件是否存在
    if not os.path.exists(image_path):
        print(f"⚠️ 图片文件不存在: {image_path}")
        # 尝试使用备用坐标
        if fallback_coords and len(fallback_coords) == 2:
            print(f"💡 使用备用坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
            if config:
                click_at_position(fallback_coords[0], fallback_coords[1], config)
            else:
                print(f"   点击坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
                pyautogui.click(fallback_coords[0], fallback_coords[1])
            return True, (fallback_coords[0], fallback_coords[1])
        return False, None
    
    print(f"📁 图片路径: {image_path}")
    print(f"🎯 最大尝试次数: {max_attempts}")
    print(f"📊 基础置信度: {base_confidence}")
    
    for attempt in range(1, max_attempts + 1):
        print(f"\n【尝试 {attempt}/{max_attempts}】")
        
        # 逐渐降低置信度以提高识别成功率
        current_confidence = max(0.5, base_confidence - (attempt - 1) * 0.1)
        print(f"   当前置信度: {current_confidence}")
        
        # 查找图片位置
        try:
            print(f"   🔍 正在扫描屏幕...")
            location = pyautogui.locateCenterOnScreen(image_path, confidence=current_confidence)
        except ImportError as e:
            print(f"\n❌ 错误：缺少必要的库")
            print(f"   详细信息: {e}")
            print("\n💡 解决方案：")
            print("   请安装以下库以支持图片识别功能:")
            print("   pip3 install opencv-python pyscreeze Pillow")
            # 尝试使用备用坐标
            if fallback_coords and len(fallback_coords) == 2:
                print(f"\n💡 使用备用坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
                if config:
                    click_at_position(fallback_coords[0], fallback_coords[1], config)
                else:
                    pyautogui.click(fallback_coords[0], fallback_coords[1])
                return True, (fallback_coords[0], fallback_coords[1])
            return False, None
        except Exception as e:
            print(f"   ⚠️ 扫描时出错: {e}")
            location = None
        
        if location:
            print(f"\n✅ 找到目标！")
            print(f"   坐标位置: ({location.x}, {location.y})")
            
            # 移动鼠标到目标位置
            print(f"\n🖱️ 准备点击...")
            pyautogui.moveTo(location.x, location.y, duration=0.2)
            time.sleep(0.3)
            
            # 执行点击
            try:
                if click_count == 2:
                    print(f"   👆👆 执行双击操作...")
                    double_click_at_position(location.x, location.y)
                elif click_count == 1:
                    print(f"   👆 执行单击操作...")
                    pyautogui.click(location.x, location.y)
                else:
                    print(f"   👆 执行 {click_count} 次点击...")
                    for i in range(click_count):
                        pyautogui.click(location.x, location.y)
                        if i < click_count - 1:
                            time.sleep(click_interval)
                
                print(f"✅ 点击完成！")
                return True, (location.x, location.y)
                
            except Exception as e:
                print(f"   ⚠️ 点击操作失败: {e}")
                # 继续尝试使用备用坐标
        else:
            print(f"   ❌ 未找到目标")
            
            if attempt < max_attempts:
                print(f"   💡 等待 {retry_interval} 秒后重试...")
                time.sleep(retry_interval)
    
    # 所有尝试都失败了，尝试使用备用坐标
    print(f"\n⚠️ 图片定位全部失败")
    if fallback_coords and len(fallback_coords) == 2:
        print(f"💡 尝试使用备用坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
        if config:
            click_at_position(fallback_coords[0], fallback_coords[1], config)
        else:
            pyautogui.click(fallback_coords[0], fallback_coords[1])
        return True, (fallback_coords[0], fallback_coords[1])
    
    print(f"❌ 未配置备用坐标，定位失败")
    return False, None

def click_input_box_by_image(config):
    """
    通过图片定位点击输入框
    输入框特殊处理：使用locateOnScreen获取完整区域，点击左侧偏内位置确保光标定位
    优先使用图片定位，失败时使用备用坐标（如果配置了）
    """
    image_path = get_input_box_image_path(config)
    base_confidence = config.get('input_box_confidence', 0.8)
    max_attempts = config.get('input_box_max_attempts', 3)
    fallback_coords = config.get('input_box_coordinates')
    
    print(f"\n{'#' * 60}")
    print("# 定位输入框")
    print(f"{'#' * 60}")
    
    # 检查图片文件是否存在
    if not os.path.exists(image_path):
        print(f"⚠️ 输入框图片文件不存在: {image_path}")
        if fallback_coords and len(fallback_coords) == 2:
            print(f"💡 使用备用坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
            click_at_position(fallback_coords[0], fallback_coords[1], config)
            return True, (fallback_coords[0], fallback_coords[1])
        return False, None
    
    print(f"📁 图片路径: {image_path}")
    print(f"🎯 最大尝试次数: {max_attempts}")
    print(f"📊 基础置信度: {base_confidence}")
    
    for attempt in range(1, max_attempts + 1):
        print(f"\n【尝试 {attempt}/{max_attempts}】")
        current_confidence = max(0.5, base_confidence - (attempt - 1) * 0.1)
        print(f"   当前置信度: {current_confidence}")
        
        try:
            print(f"   🔍 正在扫描屏幕查找输入框...")
            # 使用 locateOnScreen 获取完整区域而非中心点
            box = pyautogui.locateOnScreen(image_path, confidence=current_confidence)
        except ImportError as e:
            print(f"\n❌ 错误：缺少必要的库: {e}")
            print("   请安装: pip3 install opencv-python pyscreeze Pillow")
            if fallback_coords and len(fallback_coords) == 2:
                print(f"💡 使用备用坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
                click_at_position(fallback_coords[0], fallback_coords[1], config)
                return True, (fallback_coords[0], fallback_coords[1])
            return False, None
        except Exception as e:
            print(f"   ⚠️ 扫描时出错: {e}")
            box = None
        
        if box:
            print(f"\n✅ 找到输入框！")
            print(f"   区域: left={box.left}, top={box.top}, width={box.width}, height={box.height}")
            
            # 计算点击位置：水平方向左侧偏内（左1/4处），垂直方向居中
            # 这样可以确保点击到文本输入区域而非输入框边缘
            click_x = box.left + box.width // 4
            click_y = box.top + box.height // 2
            print(f"   计算点击位置: ({click_x}, {click_y}) [左侧1/4处，垂直居中]")
            
            # 移动鼠标到计算位置
            print(f"   🖱️ 移动鼠标到输入框内部...")
            pyautogui.moveTo(click_x, click_y, duration=0.2)
            time.sleep(0.3)
            
            # 单击激活输入框
            print(f"   👆 单击激活输入框...")
            pyautogui.click(click_x, click_y)
            time.sleep(0.5)
            
            # 再次点击确保焦点获取（输入框可能需要双击才能获得焦点）
            print(f"   👆 再次点击确保焦点获取...")
            pyautogui.click(click_x, click_y)
            time.sleep(0.5)
            
            print(f"✅ 输入框定位并激活成功！点击坐标: ({click_x}, {click_y})")
            return True, (click_x, click_y)
        else:
            print(f"   ❌ 未找到输入框")
            if attempt < max_attempts:
                print(f"   💡 等待 2 秒后重试...")
                time.sleep(2)
    
    # 图片定位全部失败，尝试使用备用坐标
    print(f"\n⚠️ 输入框图片定位全部失败")
    if fallback_coords and len(fallback_coords) == 2:
        print(f"💡 尝试使用备用坐标: ({fallback_coords[0]}, {fallback_coords[1]})")
        click_at_position(fallback_coords[0], fallback_coords[1], config)
        return True, (fallback_coords[0], fallback_coords[1])
    
    print(f"❌ 未配置备用坐标，输入框定位失败")
    return False, None

def click_run_button_by_image(config):
    """
    通过图片定位点击运行按钮
    优先使用图片定位，失败时使用备用坐标（如果配置了）
    """
    image_path = get_run_button_image_path(config)
    base_confidence = config.get('run_button_confidence', 0.8)
    max_attempts = config.get('run_button_max_attempts', 3)
    fallback_coords = config.get('run_button_coordinates')
    
    print(f"\n{'#' * 60}")
    print("# 定位运行按钮")
    print(f"{'#' * 60}")
    
    success, coords = locate_and_click_by_image(
        image_path=image_path,
        base_confidence=base_confidence,
        max_attempts=max_attempts,
        retry_interval=2,
        click_count=1,
        fallback_coords=fallback_coords,
        config=config
    )
    
    if success:
        print(f"\n✅ 运行按钮定位并点击成功！坐标: {coords}")
        return True, coords
    else:
        print(f"\n⚠️ 运行按钮定位失败")
        return False, None

def get_session_id_button_image_path(config):
    """获取SessionID按钮图片的完整路径"""
    image_name = config.get('session_id_button_image', 'images/sessionid_button.png')
    # 首先检查是否是绝对路径
    if os.path.isabs(image_name):
        return image_name
    # 否则，相对于脚本所在目录
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def click_session_id_button(config):
    """
    点击SessionID按钮并验证SessionID是否成功复制到剪贴板
    
    工作流程：
    1. 等待指定时间（让SessionID按钮出现）
    2. 通过图片识别查找SessionID复制按钮
    3. 清空剪贴板（以便验证）
    4. 点击按钮（支持单击、双击、多次点击）
    5. 从剪贴板读取内容
    6. 验证读取的内容是否是有效的SessionID
    7. 如果失败，重试整个流程
    """
    wait_time = config.get('session_id_wait_time', 5)
    image_path = get_session_id_button_image_path(config)
    base_confidence = config.get('session_id_confidence', 0.8)
    max_attempts = config.get('session_id_max_attempts', 3)
    retry_interval = config.get('session_id_retry_interval', 2)
    click_count = config.get('session_id_click_count', 2)  # 默认双击
    click_interval = config.get('session_id_click_interval', 0.3)  # 点击间隔
    verify_timeout = config.get('session_id_verify_timeout', 5)  # 验证超时时间
    
    print(f"\n{'=' * 60}")
    print("开始获取SessionID...")
    print(f"点击RUN按钮后等待 {wait_time} 秒...")
    print(f"{'=' * 60}\n")
    
    # 倒计时等待
    for i in range(wait_time, 0, -1):
        if i % 5 == 0 or i <= 5:
            print(f"  还剩 {i} 秒...")
        time.sleep(1)
    
    print("\n开始查找SessionID复制按钮...")
    print(f"使用图片: {image_path}")
    print(f"最大尝试次数: {max_attempts}")
    print(f"初始置信度: {base_confidence}")
    print(f"点击次数: {click_count}次")
    
    # 检查图片文件是否存在
    if not os.path.exists(image_path):
        print(f"\n❌ 错误：找不到按钮图片文件: {image_path}")
        print("请确保 sessionid_button.png 文件与脚本在同一目录下")
        return None
    
    # 主尝试循环
    for main_attempt in range(1, max_attempts + 1):
        print(f"\n{'=' * 60}")
        print(f"【主尝试 {main_attempt}/{max_attempts}】")
        print(f"{'=' * 60}")
        
        # 逐渐降低置信度，提高识别成功率
        current_confidence = max(0.5, base_confidence - (main_attempt - 1) * 0.1)
        print(f"\n当前置信度: {current_confidence}")
        
        # 步骤1：查找按钮
        print("🔍 正在扫描屏幕查找SessionID复制按钮...")
        try:
            location = pyautogui.locateCenterOnScreen(image_path, confidence=current_confidence)
        except ImportError as e:
            print(f"\n❌ 错误：缺少必要的库")
            print(f"   详细信息: {e}")
            print("\n💡 解决方案：")
            print("   请安装以下库以支持图片识别功能:")
            print("   pip3 install opencv-python pyscreeze Pillow")
            return None
        except Exception as e:
            print(f"   ⚠️ 扫描时出错: {e}")
            location = None
        
        if not location:
            print(f"   ❌ 未找到SessionID复制按钮")
            print(f"   💡 等待 {retry_interval} 秒后重试...")
            time.sleep(retry_interval)
            continue
        
        print(f"\n✅ 找到SessionID复制按钮！")
        print(f"   坐标位置: ({location.x}, {location.y})")
        
        # 步骤2：清空剪贴板（以便验证）
        print("\n🧹 清空剪贴板以便验证...")
        if clear_clipboard():
            print("   ✅ 剪贴板已清空")
        else:
            print("   ⚠️ 清空剪贴板失败，继续尝试...")
        
        # 检查清空后的剪贴板
        clipboard_before = get_from_clipboard()
        print(f"   📋 清空后剪贴板内容: {repr(clipboard_before)[:100] if clipboard_before else '空'}")
        
        # 步骤3：点击按钮
        print(f"\n🖱️ 准备点击按钮...")
        print(f"   点击方式: {'双击' if click_count == 2 else f'{click_count}次点击'}")
        print(f"   目标坐标: ({location.x}, {location.y})")
        print(f"   点击间隔: {click_interval}秒")
        
        try:
            # 先将鼠标移动到按钮位置并悬停一下
            print(f"   📍 移动鼠标到按钮位置: ({location.x}, {location.y})")
            pyautogui.moveTo(location.x, location.y, duration=0.2)
            time.sleep(0.5)

            current_position = pyautogui.position()
            print(f"   📍 点击前鼠标位置: ({current_position.x}, {current_position.y})")

            # 确保鼠标已经到达目标位置
            if abs(current_position.x - location.x) > 5 or abs(current_position.y - location.y) > 5:
                print(f"   ⚠️ 鼠标位置不准确，重新定位...")
                pyautogui.moveTo(location.x, location.y, duration=0.1)
                time.sleep(0.3)
            
            if click_count == 2:
                print(f"   👆👆 执行双击操作...")
                try:
                    if QUARTZ_AVAILABLE:
                        print(f"   🖱️ 使用Quartz原生双击（macOS系统级双击）...")
                        double_click_at_position(location.x, location.y)
                        print(f"   ✅ 双击完成（Quartz方式）")
                    else:
                        print(f"   🖱️ Quartz不可用，使用pyautogui双击...")
                        pyautogui.click(location.x, location.y, clicks=2, interval=0.1)
                        print(f"   ✅ 双击完成（pyautogui方式）")
                except Exception as e:
                    print(f"   ⚠️ 首选双击方式失败: {e}，尝试备用方式...")
                    try:
                        double_click_at_position(location.x, location.y)
                        print(f"   ✅ 双击完成（备用方式）")
                    except Exception as e2:
                        print(f"   ❌ 所有双击方式都失败了: {e2}")
                        raise
            elif click_count == 1:
                # 单击
                print(f"   👆 执行单击操作...")
                pyautogui.click(location.x, location.y)
                print(f"   ✅ 单击完成")
            else:
                # 多次点击
                print(f"   👆 执行 {click_count} 次点击...")
                for i in range(click_count):
                    print(f"   👆 第 {i+1} 次点击...")
                    pyautogui.click(location.x, location.y)
                    print(f"   ✅ 第 {i+1} 次点击完成")
                    if i < click_count - 1:
                        print(f"   ⏳ 等待 {click_interval} 秒...")
                        time.sleep(click_interval)
                print(f"   ✅ {click_count} 次点击完成")
            
            # 记录点击后的鼠标位置（用于调试）
            current_position_after = pyautogui.position()
            print(f"   📍 点击后鼠标位置: ({current_position_after.x}, {current_position_after.y})")
            
            # 点击后等待更长时间，让应用有足够时间响应
            print(f"   ⏳ 等待应用响应（2秒）...")
            time.sleep(2)
            
        except Exception as e:
            print(f"   ❌ 点击操作失败: {e}")
            import traceback
            print(f"   📋 详细错误信息: {traceback.format_exc()}")
        
        print(f"\n⏳ 等待Trae将SessionID复制到剪贴板...")
        
        # 步骤4：验证SessionID是否成功复制（带超时的轮询）
        session_id_data = None
        clipboard_content = None
        
        for verify_attempt in range(1, verify_timeout + 1):
            time.sleep(1)
            clipboard_content = get_from_clipboard()
            
            print(f"   【验证 {verify_attempt}/{verify_timeout}】")
            print(f"   📋 剪贴板内容: {repr(clipboard_content)[:150] if clipboard_content else '空'}")
            
            # 验证剪贴板内容
            if clipboard_content and clipboard_content != clipboard_before:
                session_id_data = validate_session_id(clipboard_content)
                if session_id_data:
                    print(f"\n✅ 成功验证SessionID！")
                    break
        
        # 检查验证结果 - 如果失败且是双击，尝试单击作为备用方案
        if not (session_id_data and session_id_data.get('valid')) and click_count == 2:
            print(f"\n⚠️ 双击未成功，尝试单击作为备用方案...")
            print(f"   👆 执行单击操作...")
            
            try:
                pyautogui.click(location.x, location.y)
                print(f"   ✅ 单击完成")
                print(f"   ⏳ 等待应用响应（2秒）...")
                time.sleep(2)
                
                # 再次验证
                print(f"\n⏳ 重新验证SessionID...")
                for verify_attempt in range(1, verify_timeout + 1):
                    time.sleep(1)
                    clipboard_content = get_from_clipboard()
                    
                    print(f"   【验证 {verify_attempt}/{verify_timeout}】")
                    print(f"   📋 剪贴板内容: {repr(clipboard_content)[:150] if clipboard_content else '空'}")
                    
                    if clipboard_content and clipboard_content != clipboard_before:
                        session_id_data = validate_session_id(clipboard_content)
                        if session_id_data:
                            print(f"\n✅ 单击成功获取SessionID！")
                            break
                            
            except Exception as e:
                print(f"   ❌ 单击操作失败: {e}")
        
        # 检查最终验证结果
        if session_id_data and session_id_data.get('valid'):
            print(f"\n{'=' * 60}")
            print("🎉 SessionID获取成功！")
            print(f"{'=' * 60}")
            
            # 显示详细信息
            if session_id_data.get('format') == 'full':
                print(f"\n📊 SessionID详细信息：")
                print(f"   完整ID: {session_id_data.get('full_id', 'N/A')}")
                print(f"   用户ID: {session_id_data.get('user_id', 'N/A')}")
                print(f"   追踪ID: {session_id_data.get('trace_id', 'N/A')}")
                print(f"   会话ID: {session_id_data.get('session_id', 'N/A')}")
                print(f"   任务ID: {session_id_data.get('task_id', 'N/A')}")
                print(f"   消息ID: {session_id_data.get('message_id', 'N/A')}")
                print(f"   应用名: {session_id_data.get('app_name', 'N/A')}")
                print(f"   时间戳: {session_id_data.get('timestamp', 'N/A')}")
            else:
                print(f"\n📊 SessionID信息：")
                print(f"   会话ID: {session_id_data.get('session_id', 'N/A')}")
            
            print(f"\n📋 SessionID已保存到剪贴板！")
            print("=" * 60)
            return session_id_data
        else:
            print(f"\n⚠️ 本次尝试未能成功获取SessionID")
            print(f"   剪贴板最终内容: {repr(clipboard_content)[:200] if clipboard_content else '空'}")
            
            if main_attempt < max_attempts:
                print(f"\n💡 等待 {retry_interval} 秒后进行下一次尝试...")
                time.sleep(retry_interval)
    
    # 所有主尝试都失败了
    print(f"\n{'=' * 60}")
    print("❌ 错误：未能成功获取SessionID")
    print(f"{'=' * 60}")
    print("\n可能的原因和解决方案：")
    
    print("\n1. 🖼️ 按钮图片问题：")
    print("   - 确保 sessionid_button.png 是当前TRAE CN界面的准确截图")
    print("   - 截图应该只包含按钮本身，不要包含多余的背景")
    print("   - 建议重新截取按钮图片，确保分辨率和颜色匹配")
    
    print("\n2. 👁️ 界面可见性问题：")
    print("   - 确保TRAE CN窗口在前台并且可见")
    print("   - 确保SessionID复制按钮没有被其他窗口遮挡")
    print("   - 确保按钮在当前屏幕可见区域内（可能需要滚动）")
    
    print("\n3. 📊 置信度设置问题：")
    print(f"   - 当前使用的置信度范围: 0.5 - {base_confidence}")
    print("   - 可以在配置文件中降低 session_id_confidence 值")
    print("   - 建议值: 0.6 - 0.8")
    
    print("\n4. 🖱️ 点击方式问题：")
    print(f"   - 当前点击次数: {click_count}次")
    print("   - 有些按钮可能需要单击、双击或多次点击")
    print("   - 可以在配置文件中调整 session_id_click_count 值")
    
    print("\n5. ⏱️ 时机问题：")
    print(f"   - 当前等待时间: {wait_time} 秒")
    print("   - 如果按钮出现较晚，可以增加 session_id_wait_time 值")
    print(f"   - 当前验证超时: {verify_timeout} 秒")
    print("   - 可以增加 session_id_verify_timeout 值")
    
    print("\n6. 🔧 按钮功能问题：")
    print("   - 确保点击的按钮确实是\"复制SessionID\"按钮")
    print("   - 手动点击按钮测试是否能复制SessionID到剪贴板")
    print("   - 确认TRAE CN软件的版本和界面布局")
    
    print("\n💡 调试建议：")
    print("   1. 运行脚本时观察TRAE CN界面，确认按钮是否出现")
    print("   2. 手动点击按钮，检查SessionID是否能复制到剪贴板")
    print("   3. 重新截取按钮图片，确保只包含按钮本身")
    print("   4. 尝试调整配置文件中的参数")
    print("   5. 检查是否安装了所有必要的依赖库")
    
    print("\n📝 可调整的配置参数：")
    print("   - session_id_wait_time: 等待按钮出现的时间（秒）")
    print("   - session_id_confidence: 图片识别置信度（0.5-0.9）")
    print("   - session_id_max_attempts: 最大尝试次数")
    print("   - session_id_click_count: 点击按钮的次数")
    print("   - session_id_verify_timeout: 验证超时时间（秒）")
    
    return None

def get_finish_button_image_path(config):
    image_name = config.get('finish_button_image', 'images/finish.png')
    if os.path.isabs(image_name):
        return image_name
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def get_finish_button_all_image_path(config):
    image_name = config.get('finish_button_all_image', 'images/finish_all.png')
    if os.path.isabs(image_name):
        return image_name
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def get_close_windows_image_path(config):
    image_name = config.get('close_windows_image', 'images/close_windows.png')
    if os.path.isabs(image_name):
        return image_name
    script_dir = os.path.dirname(__file__)
    return os.path.join(script_dir, image_name)

def scroll_log_to_bottom(config):
    """
    将日志窗口滚动到最底部
    定位到指定坐标，点击激活窗口，然后滚动到底部
    """
    coords = config.get('log_scroll_coordinates', [590, 355])
    if not coords or len(coords) != 2:
        return
    x, y = coords
    try:
        pyautogui.click(x, y)
        time.sleep(0.3)
        pyautogui.scroll(-5, x, y)
        time.sleep(0.2)
    except Exception as e:
        print(f"   ⚠️ 滚动日志窗口出错: {e}")

def handle_runtime_buttons(config):
    """
    在任务执行过程中检测并处理运行时出现的按钮：
    - save_all.png: 保存全部按钮，直接点击
    - runing.png: 运行中按钮，直接点击
    - delete_file.png: 删除文件按钮，点击后等待1秒再点击deletefile_confirm.png确认
    - submit_answer.png: 提交答案按钮，直接点击
    - next.png: 下一步按钮，直接点击
    """
    script_dir = os.path.dirname(__file__)

    save_all_image = os.path.join(script_dir, config.get('save_all_image', 'images/save_all.png'))
    save_all_confidence = config.get('save_all_confidence', 0.8)

    runing_image = os.path.join(script_dir, config.get('runing_image', 'images/runing.png'))
    runing_confidence = config.get('runing_confidence', 0.8)

    delete_file_image = os.path.join(script_dir, config.get('delete_file_image', 'images/delete_file.png'))
    delete_file_confidence = config.get('delete_file_confidence', 0.8)

    deletefile_confirm_image = os.path.join(script_dir, config.get('deletefile_confirm_image', 'images/deletefile_confirm.png'))
    deletefile_confirm_confidence = config.get('deletefile_confirm_confidence', 0.8)
    delete_file_confirm_delay = config.get('delete_file_confirm_delay', 1.0)

    submit_answer_image = os.path.join(script_dir, config.get('submit_answer_image', 'images/submit_answer.png'))
    submit_answer_confidence = config.get('submit_answer_confidence', 0.8)

    next_image = os.path.join(script_dir, config.get('next_image', 'images/next.png'))
    next_confidence = config.get('next_confidence', 0.8)

    clicked_something = False

    if os.path.exists(save_all_image):
        try:
            loc = pyautogui.locateCenterOnScreen(save_all_image, confidence=save_all_confidence)
            if loc:
                print(f"   🔔 检测到 save_all.png 按钮，坐标: ({loc.x}, {loc.y})，正在点击...")
                pyautogui.click(loc.x, loc.y)
                clicked_something = True
                time.sleep(0.5)
        except Exception:
            pass

    if os.path.exists(runing_image):
        try:
            loc = pyautogui.locateCenterOnScreen(runing_image, confidence=runing_confidence)
            if loc:
                print(f"   🔔 检测到 runing.png 按钮，坐标: ({loc.x}, {loc.y})，正在点击...")
                pyautogui.click(loc.x, loc.y)
                clicked_something = True
                time.sleep(0.5)
        except Exception:
            pass

    if os.path.exists(delete_file_image):
        try:
            loc = pyautogui.locateCenterOnScreen(delete_file_image, confidence=delete_file_confidence)
            if loc:
                print(f"   🔔 检测到 delete_file.png 按钮，坐标: ({loc.x}, {loc.y})，正在点击...")
                pyautogui.click(loc.x, loc.y)
                clicked_something = True
                print(f"   ⏳ 等待 {delete_file_confirm_delay} 秒后点击确认按钮...")
                time.sleep(delete_file_confirm_delay)

                if os.path.exists(deletefile_confirm_image):
                    confirm_loc = pyautogui.locateCenterOnScreen(deletefile_confirm_image, confidence=deletefile_confirm_confidence)
                    if confirm_loc:
                        print(f"   🔔 检测到 deletefile_confirm.png 确认按钮，坐标: ({confirm_loc.x}, {confirm_loc.y})，正在点击...")
                        pyautogui.click(confirm_loc.x, confirm_loc.y)
                        time.sleep(0.5)
                    else:
                        print(f"   ⚠️ 未找到 deletefile_confirm.png 确认按钮")
                else:
                    print(f"   ⚠️ deletefile_confirm.png 图片文件不存在: {deletefile_confirm_image}")
        except Exception:
            pass

    if os.path.exists(submit_answer_image):
        try:
            loc = pyautogui.locateCenterOnScreen(submit_answer_image, confidence=submit_answer_confidence)
            if loc:
                print(f"   🔔 检测到 submit_answer.png 按钮，坐标: ({loc.x}, {loc.y})，正在点击...")
                pyautogui.click(loc.x, loc.y)
                clicked_something = True
                time.sleep(0.5)
        except Exception:
            pass

    if os.path.exists(next_image):
        try:
            loc = pyautogui.locateCenterOnScreen(next_image, confidence=next_confidence)
            if loc:
                print(f"   🔔 检测到 next.png 按钮，坐标: ({loc.x}, {loc.y})，正在点击...")
                pyautogui.click(loc.x, loc.y)
                clicked_something = True
                time.sleep(0.5)
        except Exception:
            pass

    return clicked_something

def close_all_windows(config):
    """
    循环搜索界面上所有close_windows.png的区域，并点击关闭，
    直到界面上没有close_windows.png的定位为止。
    noclick图片支持两种模式：
    - proximity: 如果noclick图片在close_windows.png附近（距离内），则跳过
    - height: 如果close_windows.png与noclick图片的Y范围重叠，则跳过
    """
    image_path = get_close_windows_image_path(config)
    base_confidence = config.get('close_windows_confidence', 0.8)
    max_attempts = config.get('close_windows_max_attempts', 10)
    click_interval = config.get('close_windows_click_interval', 1)

    noclick_images_config = config.get('noclick_images', [
        {'image': 'noclick1.png', 'confidence': 0.8, 'mode': 'proximity'},
        {'image': 'noclick2.png', 'confidence': 0.8, 'mode': 'height'}
    ])
    noclick_proximity = config.get('noclick_proximity', 150)

    script_dir = os.path.dirname(__file__)
    noclick_list = []
    for nc in noclick_images_config:
        img_name = nc.get('image', '')
        img_path = os.path.join(script_dir, img_name) if not os.path.isabs(img_name) else img_name
        img_conf = nc.get('confidence', 0.8)
        img_mode = nc.get('mode', 'proximity')
        if os.path.exists(img_path):
            noclick_list.append({'path': img_path, 'confidence': img_conf, 'name': img_name, 'mode': img_mode})

    print(f"\n{'=' * 60}")
    print("开始关闭所有已打开的窗口...")
    print(f"{'=' * 60}")

    if not os.path.exists(image_path):
        print(f"⚠️ 关闭窗口图片文件不存在: {image_path}")
        print("跳过关闭窗口操作")
        return

    print(f"📁 图片路径: {image_path}")
    print(f"📊 基础置信度: {base_confidence}")
    print(f"🔄 最大尝试次数: {max_attempts}")

    if noclick_list:
        for nc in noclick_list:
            mode_desc = "邻近距离" if nc['mode'] == 'proximity' else "同高度区域"
            if nc['mode'] == 'proximity':
                print(f"🚫 禁止点击图片: {nc['name']} (置信度: {nc['confidence']}, 模式: {mode_desc}, 范围: {noclick_proximity}px)")
            else:
                print(f"🚫 禁止点击图片: {nc['name']} (置信度: {nc['confidence']}, 模式: {mode_desc})")
    else:
        print(f"⚠️ 无可用禁止点击图片，将不进行过滤")

    def is_noclick_blocked(x, y, noclick_data_list):
        for nc in noclick_data_list:
            if nc['mode'] == 'height':
                for box in nc['boxes']:
                    if box.top <= y <= box.top + box.height:
                        print(f"   🚫 关闭按钮 ({x}, {y}) 与noclick区域 {nc['name']} (Y范围: {box.top}-{box.top + box.height}) 高度重叠，跳过")
                        return True
            else:
                for center in nc['centers']:
                    dist = ((x - center.x) ** 2 + (y - center.y) ** 2) ** 0.5
                    if dist <= noclick_proximity:
                        print(f"   🚫 关闭按钮 ({x}, {y}) 附近有noclick区域 {nc['name']} ({center.x}, {center.y})，距离 {dist:.0f}px，跳过")
                        return True
        return False

    closed_count = 0
    skipped_count = 0

    for attempt in range(1, max_attempts + 1):
        current_confidence = max(0.5, base_confidence - (attempt - 1) * 0.05)
        print(f"\n【关闭窗口尝试 {attempt}/{max_attempts}】置信度: {current_confidence}")

        noclick_data_list = []
        for nc in noclick_list:
            nc_entry = {'name': nc['name'], 'mode': nc['mode'], 'centers': [], 'boxes': []}
            try:
                for box in pyautogui.locateAllOnScreen(nc['path'], confidence=nc['confidence']):
                    nc_entry['centers'].append(pyautogui.center(box))
                    nc_entry['boxes'].append(box)
            except Exception as e:
                print(f"⚠️ 扫描noclick图片 {nc['name']} 出错: {e}")
            noclick_data_list.append(nc_entry)

        total_noclick = sum(len(nc['centers']) for nc in noclick_data_list)
        if total_noclick > 0:
            print(f"   🚫 找到 {total_noclick} 个禁止点击区域")

        try:
            location = pyautogui.locateCenterOnScreen(image_path, confidence=current_confidence)
        except Exception as e:
            print(f"⚠️ 扫描时出错: {e}")
            location = None

        if location:
            is_blocked = is_noclick_blocked(location.x, location.y, noclick_data_list)

            if is_blocked:
                skipped_count += 1
                try:
                    all_close = list(pyautogui.locateAllOnScreen(image_path, confidence=current_confidence))
                except Exception:
                    all_close = []

                clicked_alternative = False
                for box in all_close:
                    alt_loc = pyautogui.center(box)
                    if alt_loc.x == location.x and alt_loc.y == location.y:
                        continue
                    if not is_noclick_blocked(alt_loc.x, alt_loc.y, noclick_data_list):
                        print(f"✅ 找到其他关闭按钮！坐标: ({alt_loc.x}, {alt_loc.y})")
                        pyautogui.moveTo(alt_loc.x, alt_loc.y, duration=0.2)
                        time.sleep(0.3)
                        pyautogui.click(alt_loc.x, alt_loc.y)
                        closed_count += 1
                        print(f"👆 已点击关闭第 {closed_count} 个窗口")
                        clicked_alternative = True
                        time.sleep(click_interval)
                        break

                if not clicked_alternative:
                    print(f"   没有其他可点击的关闭按钮，本轮跳过")
                    time.sleep(click_interval)
            else:
                print(f"✅ 找到关闭按钮！坐标: ({location.x}, {location.y})")
                pyautogui.moveTo(location.x, location.y, duration=0.2)
                time.sleep(0.3)
                pyautogui.click(location.x, location.y)
                closed_count += 1
                print(f"👆 已点击关闭第 {closed_count} 个窗口")
                time.sleep(click_interval)
        else:
            print(f"❌ 未找到更多关闭按钮")
            break

    print(f"\n{'=' * 60}")
    if closed_count > 0:
        print(f"✅ 共关闭了 {closed_count} 个窗口")
    else:
        print("没有找到需要关闭的窗口")
    if skipped_count > 0:
        print(f"🚫 跳过了 {skipped_count} 个被noclick区域阻止的关闭按钮")
    print(f"{'=' * 60}")

def wait_for_finish_and_get_trace(config):
    max_wait = config.get('finish_button_max_wait', 600)
    check_interval = config.get('finish_button_check_interval', 5)
    image_path = get_finish_button_image_path(config)
    all_image_path = get_finish_button_all_image_path(config)
    base_confidence = config.get('finish_button_confidence', 0.8)
    all_confidence = config.get('finish_button_all_confidence', 0.8)
    click_count = config.get('finish_button_click_count', 2)
    click_interval = config.get('finish_button_click_interval', 0.3)
    verify_timeout = config.get('finish_button_verify_timeout', 5)

    task_finish_image_name = config.get('task_finish_image', 'images/task_finish.png')
    task_finish_confidence = config.get('task_finish_confidence', 0.8)
    script_dir = os.path.dirname(__file__)
    task_finish_image_path = os.path.join(script_dir, task_finish_image_name) if not os.path.isabs(task_finish_image_name) else task_finish_image_name

    exception_image_name = config.get('exception_image', 'images/exception.png')
    exception_confidence = config.get('exception_confidence', 0.8)
    exception_image_path = os.path.join(script_dir, exception_image_name) if not os.path.isabs(exception_image_name) else exception_image_name

    retry_image_name = config.get('retry_image', 'images/retry.png')
    retry_confidence = config.get('retry_confidence', 0.8)
    retry_image_path = os.path.join(script_dir, retry_image_name) if not os.path.isabs(retry_image_name) else retry_image_name

    print(f"\n{'=' * 60}")
    print("等待Finish按钮出现...")
    print(f"最大等待时间: {max_wait}秒")
    print(f"检测间隔: {check_interval}秒")
    print(f"使用图片: {image_path}")
    print(f"使用区域定位图片: {all_image_path}")
    print(f"使用任务完成图片: {task_finish_image_path}")
    print(f"使用异常检测图片: {exception_image_path}")
    print(f"使用重试按钮图片: {retry_image_path}")
    print(f"{'=' * 60}\n")

    if not os.path.exists(image_path):
        print(f"❌ 错误：找不到Finish按钮图片文件: {image_path}")
        print("请确保 finish.png 文件与脚本在同一目录下")
        return None

    if not os.path.exists(all_image_path):
        print(f"❌ 错误：找不到区域定位图片文件: {all_image_path}")
        print("请确保 finish_all.png 文件与脚本在同一目录下")
        return None

    task_finish_available = os.path.exists(task_finish_image_path)

    elapsed = 0
    attempt = 0

    # 阶段1：等待 finish_all.png 和 task_finish.png 同时出现
    print(f"{'=' * 60}")
    print("阶段1：等待区域定位图片 (finish_all.png) 和任务完成图片 (task_finish.png) 同时出现...")
    print(f"{'=' * 60}\n")

    all_location = None
    while elapsed < max_wait:
        attempt += 1
        remaining = max_wait - elapsed
        print(f"[检测 {attempt}] 已等待 {elapsed}秒, 剩余 {remaining}秒, 扫描区域定位图片和任务完成图片...")

        scroll_log_to_bottom(config)

        handle_runtime_buttons(config)

        script_dir = os.path.dirname(__file__)

        selected_yes_image = os.path.join(script_dir, 'images', 'selected_yes.png')
        if os.path.exists(selected_yes_image):
            try:
                selected_yes_loc = pyautogui.locateCenterOnScreen(selected_yes_image, confidence=0.8)
                if selected_yes_loc:
                    print(f"   🔔 检测到 selected_yes.png，坐标: ({selected_yes_loc.x}, {selected_yes_loc.y})")
                    yes_image = os.path.join(script_dir, 'images', 'yes.png')
                    if os.path.exists(yes_image):
                        yes_loc = pyautogui.locateCenterOnScreen(yes_image, confidence=0.8)
                        if yes_loc:
                            print(f"   🔔 找到 yes.png，坐标: ({yes_loc.x}, {yes_loc.y})，正在点击...")
                            pyautogui.click(yes_loc.x, yes_loc.y)
                            time.sleep(0.3)
                            print(f"   ⌨️ 按回车键确认...")
                            pyautogui.press('enter')
                            time.sleep(0.5)
                        else:
                            print(f"   ⚠️ 未找到 yes.png")
                    else:
                        print(f"   ⚠️ yes.png 图片文件不存在")
            except Exception:
                pass

        warning_image = os.path.join(script_dir, 'images', 'warning.png')
        if os.path.exists(warning_image):
            try:
                warning_loc = pyautogui.locateCenterOnScreen(warning_image, confidence=0.8)
                if warning_loc:
                    print(f"   🔔 检测到 warning.png，坐标: ({warning_loc.x}, {warning_loc.y})")
                    running_bg_image = os.path.join(script_dir, 'images', 'running_background.png')
                    if os.path.exists(running_bg_image):
                        bg_loc = pyautogui.locateCenterOnScreen(running_bg_image, confidence=0.8)
                        if bg_loc:
                            print(f"   🔔 找到 running_background.png，坐标: ({bg_loc.x}, {bg_loc.y})，正在点击...")
                            pyautogui.click(bg_loc.x, bg_loc.y)
                            time.sleep(0.5)
                        else:
                            print(f"   ⚠️ 未找到 running_background.png")
                    else:
                        print(f"   ⚠️ running_background.png 图片文件不存在")
            except Exception:
                pass

        app_name = config.get('app_name', 'TRAE CN')
        frontmost_script = f'''
        tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
            return frontApp
        end tell
        '''
        frontmost_app = run_applescript(frontmost_script)
        if frontmost_app != app_name:
            print(f"   ⚠️ {app_name} 不在前台（当前前台: {frontmost_app}），正在切换到前台...")
            bring_window_to_front(config)
        else:
            print(f"   ✅ {app_name} 在前台运行")

        current_all_confidence = max(0.5, all_confidence - 0.05 * min(attempt // 20, 3))

        try:
            all_location = pyautogui.locateOnScreen(all_image_path, confidence=current_all_confidence)
        except Exception as e:
            print(f"⚠️ 区域定位图片扫描出错: {e}")
            all_location = None

        if all_location:
            print(f"   ✅ 找到区域定位图片 finish_all.png！区域: left={all_location.left}, top={all_location.top}, width={all_location.width}, height={all_location.height}")

            exception_found = False
            if os.path.exists(exception_image_path):
                try:
                    exception_loc = pyautogui.locateCenterOnScreen(exception_image_path, confidence=exception_confidence)
                    if exception_loc:
                        exception_found = True
                        print(f"   ⚠️ 检测到异常图片 exception.png！坐标: ({exception_loc.x}, {exception_loc.y})")
                except Exception as e:
                    print(f"   ⚠️ 异常图片扫描出错: {e}")

            if exception_found and os.path.exists(retry_image_path):
                retry_region = (all_location.left, all_location.top, all_location.width, all_location.height)
                print(f"   🔄 在 finish_all.png 区域内搜索 retry.png 按钮...")
                try:
                    retry_loc = pyautogui.locateCenterOnScreen(retry_image_path, confidence=retry_confidence, region=retry_region)
                    if retry_loc:
                        print(f"   ✅ 找到 retry.png 按钮！坐标: ({retry_loc.x}, {retry_loc.y})，正在点击重试...")
                        pyautogui.moveTo(retry_loc.x, retry_loc.y, duration=0.2)
                        time.sleep(0.3)
                        pyautogui.click(retry_loc.x, retry_loc.y)
                        print(f"   ✅ 已点击 retry.png 按钮，等待重试...")
                        time.sleep(config.get('wait_time', 2))
                        all_location = None
                        continue
                    else:
                        print(f"   ❌ 未在 finish_all.png 区域内找到 retry.png 按钮")
                except Exception as e:
                    print(f"   ⚠️ retry.png 按钮扫描出错: {e}")
        else:
            print(f"   ❌ 未找到 finish_all.png")

        task_finish_found = False
        if task_finish_available:
            current_task_confidence = max(0.5, task_finish_confidence - 0.05 * min(attempt // 20, 3))
            try:
                task_finish_loc = pyautogui.locateOnScreen(task_finish_image_path, confidence=current_task_confidence)
                if task_finish_loc:
                    task_finish_found = True
                    print(f"   ✅ 找到任务完成图片 task_finish.png！区域: left={task_finish_loc.left}, top={task_finish_loc.top}, width={task_finish_loc.width}, height={task_finish_loc.height}")
                else:
                    print(f"   ❌ 未找到 task_finish.png")
            except Exception as e:
                print(f"⚠️ 任务完成图片扫描出错: {e}")
        else:
            print(f"   ⚠️ task_finish.png 图片文件不存在，跳过此条件")

        if all_location and (task_finish_found or not task_finish_available):
            print(f"\n✅ 条件满足！finish_all.png {'和 task_finish.png 均已' if task_finish_available else ''}出现")
            break
        else:
            print(f"   条件未满足，继续等待...")

        if elapsed + check_interval <= max_wait:
            time.sleep(check_interval)
        else:
            time.sleep(max_wait - elapsed)
        elapsed += check_interval

    if not all_location:
        print(f"\n❌ 等待超时（{max_wait}秒），区域定位图片未出现")

        print(f"\n{'=' * 60}")
        print("超时处理：关闭TRAE CN应用并清空SOLO_CODER_DIR...")
        print(f"{'=' * 60}")

        app_name = config.get('app_name', 'TRAE CN')
        print(f"正在关闭 {app_name} 应用...")
        script = f'''
        tell application "{app_name}"
            quit
        end tell
        '''
        run_applescript(script)
        time.sleep(3)
        print(f"✅ {app_name} 应用已关闭")

        solo_dir = config.get('solo_coder_dir', '/Users/zhangyuqing/Desktop/solo-coder')
        if os.path.exists(solo_dir):
            print(f"正在清空 {solo_dir} 目录...")
            for item_file in os.listdir(solo_dir):
                item_path = os.path.join(solo_dir, item_file)
                try:
                    if os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                    else:
                        os.remove(item_path)
                except Exception as e:
                    print(f"   ⚠️ 删除 {item_path} 失败: {e}")
            print(f"✅ 已清空 {solo_dir} 目录（超时产物已作废）")
        else:
            print(f"⚠️ SOLO_CODER_DIR 目录不存在: {solo_dir}")

        return None

    # 阶段2：在 finish_all.png 的区域内定位 finish.png 按钮
    search_region = (all_location.left, all_location.top, all_location.width, all_location.height)
    print(f"\n{'=' * 60}")
    print("阶段2：在区域定位图片范围内搜索Finish按钮 (finish.png)...")
    print(f"搜索区域: left={all_location.left}, top={all_location.top}, width={all_location.width}, height={all_location.height}")
    print(f"{'=' * 60}\n")

    location = None
    finish_attempt = 0
    finish_max_attempts = 10
    finish_check_interval = 2

    while finish_attempt < finish_max_attempts:
        finish_attempt += 1
        current_confidence = max(0.5, base_confidence - 0.05 * min(finish_attempt // 5, 3))

        print(f"[Finish检测 {finish_attempt}/{finish_max_attempts}] 在区域内搜索Finish按钮，置信度: {current_confidence}")

        try:
            location = pyautogui.locateCenterOnScreen(image_path, confidence=current_confidence, region=search_region)
        except ImportError as e:
            print(f"❌ 缺少必要的库: {e}")
            print("请安装: pip3 install opencv-python pyscreeze Pillow")
            return None
        except Exception as e:
            print(f"⚠️ 扫描时出错: {e}")
            location = None

        if location:
            print(f"\n✅ 找到Finish按钮！坐标: ({location.x}, {location.y})")
            break
        else:
            print(f"   未在区域内找到Finish按钮，{finish_check_interval}秒后重试...")
            time.sleep(finish_check_interval)

    if not location:
        print(f"\n❌ 在区域内未能找到Finish按钮（已尝试 {finish_max_attempts} 次）")
        return None

    # 阶段3：点击Finish按钮
    print(f"\n{'=' * 60}")
    print("阶段3：点击Finish按钮...")
    print(f"{'=' * 60}\n")

    print("🧹 清空剪贴板以便验证...")
    clipboard_before = get_from_clipboard()
    clear_clipboard()

    print(f"🖱️ 准备点击Finish按钮（{click_count}次点击）...")
    pyautogui.moveTo(location.x, location.y, duration=0.2)
    time.sleep(0.5)

    try:
        if click_count == 2:
            print("👆👆 执行双击操作...")
            double_click_at_position(location.x, location.y)
            print("✅ 双击完成")
        elif click_count == 1:
            print("👆 执行单击操作...")
            pyautogui.click(location.x, location.y)
            print("✅ 单击完成")
        else:
            for i in range(click_count):
                print(f"👆 第 {i+1} 次点击...")
                pyautogui.click(location.x, location.y)
                if i < click_count - 1:
                    time.sleep(click_interval)
            print(f"✅ {click_count}次点击完成")

        time.sleep(2)
    except Exception as e:
        print(f"❌ 点击操作失败: {e}")
        return None

    print("⏳ 等待轨迹内容复制到剪贴板...")
    trace_content = None

    for verify_attempt in range(1, verify_timeout + 1):
        time.sleep(1)
        clipboard_content = get_from_clipboard()
        print(f"   【验证 {verify_attempt}/{verify_timeout}】剪贴板内容长度: {len(clipboard_content) if clipboard_content else 0}")

        if clipboard_content and clipboard_content != clipboard_before:
            trace_content = clipboard_content
            print(f"\n✅ 成功获取执行轨迹！内容长度: {len(trace_content)}")
            break

    if not trace_content:
        print("⚠️ 未检测到剪贴板变化，尝试读取当前剪贴板内容...")
        trace_content = get_from_clipboard()

    if trace_content:
        print(f"\n{'=' * 60}")
        print("🎉 执行轨迹获取成功！")
        print(f"轨迹内容长度: {len(trace_content)} 字符")
        print(f"轨迹内容预览: {trace_content[:200]}{'...' if len(trace_content) > 200 else ''}")
        print(f"{'=' * 60}")
        return trace_content
    else:
        print("❌ 未能从剪贴板获取轨迹内容")
        return None

def save_results_to_file(session_id_data, trace_content, config, prompt=None):
    script_dir = os.path.dirname(__file__)
    task_id = read_task_id()
    output_file = os.path.join(script_dir, f"trae_results_{task_id}.json")

    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "prompt": prompt or config.get('default_prompt', ''),
        "session_id": {},
        "trace": None
    }

    if session_id_data:
        results["session_id"] = {
            "valid": session_id_data.get('valid', False),
            "format": session_id_data.get('format', 'unknown')
        }
        if session_id_data.get('format') == 'full':
            results["session_id"]["full_id"] = session_id_data.get('full_id', '')
            results["session_id"]["user_id"] = session_id_data.get('user_id', '')
            results["session_id"]["trace_id"] = session_id_data.get('trace_id', '')
            results["session_id"]["session_id"] = session_id_data.get('session_id', '')
            results["session_id"]["task_id"] = session_id_data.get('task_id', '')
            results["session_id"]["message_id"] = session_id_data.get('message_id', '')
            results["session_id"]["app_name"] = session_id_data.get('app_name', '')
            results["session_id"]["timestamp"] = session_id_data.get('timestamp', '')
        else:
            results["session_id"]["session_id"] = session_id_data.get('session_id', '')

    if trace_content:
        results["trace"] = trace_content

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=4, ensure_ascii=False)
        print(f"\n✅ 结果已保存到文件: {output_file}")
        return True
    except Exception as e:
        print(f"\n❌ 保存结果文件失败: {e}")
        return False

def get_window_info(config):
    """获取窗口信息（调试用）"""
    app_name = config['app_name']
    script = f'''
    tell application "System Events"
        tell process "{app_name}"
            set windowList to every window
            set windowInfo to ""
            repeat with w in windowList
                set windowInfo to windowInfo & "Window: " & name of w & linefeed
                set windowInfo to windowInfo & "  Position: " & position of w & linefeed
                set windowInfo to windowInfo & "  Size: " & size of w & linefeed
            end repeat
        end tell
    end tell
    return windowInfo
    '''
    result = run_applescript(script)
    if result:
        print("窗口信息:")
        print(result)
    return result

def load_prompts_from_file(config):
    """从prompt.txt文件读取提示词，读取全部内容作为单个提示词"""
    prompt_file = os.path.join(os.path.dirname(__file__), 'prompt.txt')
    if not os.path.exists(prompt_file):
        print(f"⚠️ prompt.txt 文件不存在，使用默认提示词")
        return [config.get('default_prompt', '')]
    
    try:
        with open(prompt_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        if not content:
            print(f"⚠️ prompt.txt 文件为空，使用默认提示词")
            return [config.get('default_prompt', '')]
        
        print(f"✅ 从 prompt.txt 读取到提示词（共 {len(content)} 字符）")
        print(f"   内容预览: {content[:80]}{'...' if len(content) > 80 else ''}")
        
        return [content]
    except Exception as e:
        print(f"⚠️ 读取 prompt.txt 失败: {e}，使用默认提示词")
        return [config.get('default_prompt', '')]

def run_single_prompt(prompt, config):
    """执行单个提示词的完整自动化流程"""
    print(f"\n{'=' * 60}")
    print(f"正在执行提示词: {prompt[:80]}{'...' if len(prompt) > 80 else ''}")
    print(f"{'=' * 60}")

    input_success, input_coords = click_input_box_by_image(config)
    
    if not input_success:
        # 图片定位失败，尝试使用备用坐标（如果配置了）
        fallback_coords = config.get('input_box_coordinates')
        if fallback_coords and len(fallback_coords) == 2:
            print(f"\n💡 使用备用坐标点击输入框: {fallback_coords}")
            click_at_position(fallback_coords[0], fallback_coords[1], config)
        else:
            # 没有备用坐标，提示用户手动操作
            print("\n⚠️ 图片定位失败且未配置备用坐标，需要您手动操作：")
            print("请在5秒内点击@SOLO Coder输入框...")
            for i in range(5, 0, -1):
                print(f"{i}...")
                time.sleep(1)
            print("继续执行...")
            time.sleep(1)
    
    type_text(prompt, config)
    run_prompt_action(config)
    
    session_id_data = click_session_id_button(config)
    
    if session_id_data and session_id_data.get('valid'):
        print(f"\n✅ SessionID已保存到变量中")
        if session_id_data.get('format') == 'full':
            print(f"   会话ID: {session_id_data.get('session_id', 'N/A')}")
        else:
            print(f"   会话ID: {session_id_data.get('session_id', 'N/A')}")
    else:
        print(f"\n⚠️ 未能获取有效的SessionID，继续等待Finish按钮...")
    
    trace_content = wait_for_finish_and_get_trace(config)
    
    if trace_content:
        print(f"\n✅ 执行轨迹已保存到变量中")
        print(f"   轨迹长度: {len(trace_content)} 字符")
    else:
        print(f"\n⚠️ 未能获取执行轨迹")
    
    print(f"\n{'=' * 60}")
    print("正在保存结果到文件...")
    print(f"{'=' * 60}")
    save_results_to_file(session_id_data, trace_content, config, prompt)
    
    return session_id_data, trace_content

def main():
    """主函数"""
    print("=" * 60)
    print("Trae软件高级自动化测试脚本")
    print("=" * 60)
    
    config = load_config()
    print(f"\n配置文件: {CONFIG_FILE}")
    
    prompts = load_prompts_from_file(config)
    
    print(f"\n共 {len(prompts)} 个提示词待执行")
    print("\n注意事项：")
    print("1. 首次运行需要在系统偏好设置中授予辅助功能权限")
    print("2. 可以使用 get_coordinates.py 获取输入框坐标")
    print("3. 在配置文件中设置坐标后可以实现完全自动化\n")
    
    app_was_running = is_app_running(config['app_name'])
    
    if not app_was_running:
        if not open_trae_app(config):
            print("无法打开Trae应用，请检查应用是否正确安装")
            return
        startup_wait = config.get('startup_wait_time', 40)
        print(f"\n应用刚刚启动，等待 {startup_wait} 秒让软件完全准备就绪...")
        
        for i in range(startup_wait, 0, -1):
            if i % 5 == 0 or i <= 5:
                print(f"  还剩 {i} 秒...")
            time.sleep(1)
        print("等待完成，软件应该已准备就绪")

        app_name = config.get('app_name', 'TRAE CN')
        
        print(f"🔍 检查 {app_name} 窗口数量...")
        close_extra_windows(config)

        print(f"正在将 {app_name} 窗口最大化...")
        script = f'''
        tell application "System Events"
            tell process "{app_name}"
                set frontWindow to front window
                set value of attribute "AXFullScreen" of frontWindow to true
            end tell
        end tell
        '''
        result = run_applescript(script)
        if result is not None:
            print("✅ 窗口已最大化（全屏模式）")
        else:
            print("⚠️ 全屏模式设置失败，尝试使用 zoom 方式...")
            script_zoom = f'''
            tell application "System Events"
                tell process "{app_name}"
                    click button 3 of window 1
                end tell
            end tell
            '''
            run_applescript(script_zoom)
        time.sleep(2)

        open_dir_coords = config.get('open_dir_coordinates', [244, 21])
        if open_dir_coords and len(open_dir_coords) == 2:
            print(f"点击打开目录区域，坐标: ({open_dir_coords[0]}, {open_dir_coords[1]})")
            pyautogui.click(open_dir_coords[0], open_dir_coords[1])
            time.sleep(config.get('wait_time', 2))

        open_dir_image = get_image_path(config, 'open_dir_image', 'images/open_dir.png')
        open_dir_confidence = config.get('open_dir_confidence', 0.8)
        open_dir_max_attempts = config.get('open_dir_max_attempts', 3)
        open_dir_success, _ = locate_and_click_by_image(
            image_path=open_dir_image,
            base_confidence=open_dir_confidence,
            max_attempts=open_dir_max_attempts,
            retry_interval=2,
            click_count=1,
            config=config
        )
        if open_dir_success:
            print("✅ open_dir.png 按钮点击成功")
            print("⏳ 等待目录面板加载...")
            time.sleep(3)
        else:
            print("⚠️ open_dir.png 按钮定位失败")
            time.sleep(3)
        image_dir_image = get_image_path(config, 'image_dir_image', 'images/image_dir.png')
        image_dir_confidence = config.get('image_dir_confidence', 0.7)
        image_dir_max_attempts = config.get('image_dir_max_attempts', 5)
        image_dir_coords = config.get('image_dir_coordinates')
        image_dir_success, _ = locate_and_click_by_image(
            image_path=image_dir_image,
            base_confidence=image_dir_confidence,
            max_attempts=image_dir_max_attempts,
            retry_interval=3,
            click_count=1,
            fallback_coords=image_dir_coords,
            config=config
        )
        if image_dir_success:
            print("✅ image_dir.png 按钮点击成功")
            print("⏳ 等待界面响应...")
            time.sleep(2)
        else:
            print("⚠️ image_dir.png 按钮定位失败")

        new_dir_image = get_image_path(config, 'new_dir_image', 'images/new_dir.png')
        new_dir_confidence = config.get('new_dir_confidence', 0.8)
        new_dir_max_attempts = config.get('new_dir_max_attempts', 3)
        new_dir_success, _ = locate_and_click_by_image(
            image_path=new_dir_image,
            base_confidence=new_dir_confidence,
            max_attempts=new_dir_max_attempts,
            retry_interval=2,
            click_count=1,
            config=config
        )
        if new_dir_success:
            print("✅ new_dir.png 按钮点击成功")
            
            folder_name = read_task_id()
            print(f"📋 将文件夹名称 {folder_name} 写入剪贴板...")
            subprocess.run(['pbcopy'], input=folder_name.encode('utf-8'), capture_output=True)
            
            print("⏳ 等待 macOS 原生新建文件夹对话框弹出...")
            time.sleep(3)
            
            print("📋 全选输入框内容并粘贴文件夹名称...")
            pyautogui.hotkey('command', 'a')
            time.sleep(0.3)
            pyautogui.hotkey('command', 'v')
            time.sleep(1)
            
            print("✅ 文件夹名称输入完成")
            time.sleep(config.get('wait_time', 2))
        else:
            print("⚠️ new_dir.png 按钮定位失败")

        create_dir_image = get_image_path(config, 'create_dir_image', 'images/create_dir.png')
        create_dir_confidence = config.get('create_dir_confidence', 0.8)
        create_dir_max_attempts = config.get('create_dir_max_attempts', 3)
        create_dir_success, _ = locate_and_click_by_image(
            image_path=create_dir_image,
            base_confidence=create_dir_confidence,
            max_attempts=create_dir_max_attempts,
            retry_interval=2,
            click_count=1,
            config=config
        )
        if create_dir_success:
            print("✅ create_dir.png 按钮点击成功")
        else:
            print("⚠️ create_dir.png 按钮定位失败")

        open_dir_os_image = get_image_path(config, 'open_dir_os_image', 'images/open_dir_os.png')
        open_dir_os_confidence = config.get('open_dir_os_confidence', 0.8)
        open_dir_os_max_attempts = config.get('open_dir_os_max_attempts', 3)
        open_dir_os_success, _ = locate_and_click_by_image(
            image_path=open_dir_os_image,
            base_confidence=open_dir_os_confidence,
            max_attempts=open_dir_os_max_attempts,
            retry_interval=2,
            click_count=1,
            config=config
        )
        if open_dir_os_success:
            print("✅ open_dir_os.png 按钮点击成功")
        else:
            print("⚠️ open_dir_os.png 按钮定位失败")

        reload_wait = config.get('open_dir_reload_wait', 10)
        print(f"等待 {reload_wait} 秒，让Trae窗口重新加载...")
        time.sleep(reload_wait)

        print("正在执行启动后初始化点击操作...")

        find_history_coords = config.get('find_history_task_coordinates', [168, 150])
        if find_history_coords and len(find_history_coords) == 2:
            hx, hy = find_history_coords
            print(f"先移动鼠标到大致区域触发悬停效果... 坐标: ({hx}, {hy})")
            pyautogui.moveTo(hx, hy, duration=0.3)
            time.sleep(1)
            print(f"点击 find_history_task 位置: ({hx}, {hy})")
            pyautogui.click(hx, hy)
        else:
            print(f"⚠️ find_history_task_coordinates 配置无效，使用默认坐标 (168, 150)")
            pyautogui.moveTo(168, 150, duration=0.3)
            time.sleep(1)
            pyautogui.click(168, 150)

        print("等待 2 秒...")
        time.sleep(2)
        
        # 使用 delete_task.png 图片定位删除任务按钮
        print("使用图片定位删除任务按钮 (delete_task.png)...")
        delete_task_image = get_image_path(config, 'delete_task_image', 'images/delete_task.png')
        delete_task_confidence = config.get('delete_task_confidence', 0.8)
        delete_task_max_attempts = config.get('delete_task_max_attempts', 3)
        delete_task_success, _ = locate_and_click_by_image(
            image_path=delete_task_image,
            base_confidence=delete_task_confidence,
            max_attempts=delete_task_max_attempts,
            retry_interval=2,
            click_count=1,
            fallback_coords=(139, 260),
            config=config
        )
        if delete_task_success:
            print("✅ 删除任务按钮点击成功")
        else:
            print("⚠️ 删除任务按钮定位失败，使用备用坐标 (139, 260)")
            pyautogui.click(139, 260)
        
        print("等待 1 秒...")
        time.sleep(1)
        
        # 使用 delete.png 图片定位删除确认按钮
        print("使用图片定位删除确认按钮 (delete.png)...")
        delete_image = get_image_path(config, 'delete_image', 'images/delete.png')
        delete_confidence = config.get('delete_confidence', 0.8)
        delete_max_attempts = config.get('delete_max_attempts', 3)
        delete_success, _ = locate_and_click_by_image(
            image_path=delete_image,
            base_confidence=delete_confidence,
            max_attempts=delete_max_attempts,
            retry_interval=2,
            click_count=1,
            fallback_coords=(850, 458),
            config=config
        )
        if delete_success:
            print("✅ 删除确认按钮点击成功")
        else:
            print("⚠️ 删除确认按钮定位失败，使用备用坐标 (850, 458)")
            pyautogui.click(850, 458)
        
        time.sleep(3)

        print("初始化点击操作完成，继续执行...")
    else:
        print(f"{config['app_name']} 应用已经在运行")
        bring_window_to_front(config)
        print("等待应用窗口激活...")
        time.sleep(config['wait_time'] * 2)
    
    for i, prompt in enumerate(prompts, 1):
        print(f"\n{'#' * 60}")
        print(f"# 提示词 {i}/{len(prompts)}")
        print(f"{'#' * 60}")
        
        run_single_prompt(prompt, config)
        
        if i < len(prompts):
            print(f"\n⏳ 等待 5 秒后执行下一个提示词...")
            time.sleep(5)
    
    print("\n" + "=" * 60)
    print("自动化测试完成！")
    print(f"共执行 {len(prompts)} 个提示词")
    print("=" * 60)

    app_name = config.get('app_name', 'TRAE CN')
    print(f"\n正在关闭 {app_name} 应用...")
    script = f'''
    tell application "{app_name}"
        quit
    end tell
    '''
    run_applescript(script)
    time.sleep(3)
    print(f"✅ {app_name} 应用已关闭")
    
    input_coords = config.get('input_box_coordinates')
    if not input_coords:
        print("\n提示：")
        print("1. 运行 get_coordinates.py 获取输入框坐标")
        print(f"2. 在 {CONFIG_FILE} 中设置 input_box_coordinates")
        print("3. 之后就可以实现完全自动化运行了")

if __name__ == "__main__":
    main()
