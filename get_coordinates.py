#!/usr/bin/env python3
"""
坐标获取工具
用于获取Trae软件中@SOLO Coder输入框的坐标位置
"""

import pyautogui
import time

def get_position_with_countdown(seconds=5):
    """倒计时获取鼠标位置"""
    print(f"\n将鼠标移动到目标位置，{seconds}秒后获取坐标...")
    for i in range(seconds, 0, -1):
        print(f"{i}...")
        time.sleep(1)
    position = pyautogui.position()
    print(f"\n获取到的坐标: x={position.x}, y={position.y}")
    print(f"可以在配置中设置: INPUT_BOX_COORDINATES = ({position.x}, {position.y})")
    return position

def continuous_monitor():
    """持续监控鼠标位置"""
    print("\n启动鼠标位置监控模式（按Ctrl+C退出）")
    print("移动鼠标查看实时坐标:\n")
    try:
        last_pos = None
        while True:
            current_pos = pyautogui.position()
            if current_pos != last_pos:
                print(f"当前位置: x={current_pos.x}, y={current_pos.y}    ", end='\r')
                last_pos = current_pos
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n\n监控已停止")

def main():
    """主函数"""
    print("=" * 50)
    print("坐标获取工具")
    print("=" * 50)
    print("\n功能：")
    print("1. 倒计时获取鼠标位置（用于精确获取输入框坐标）")
    print("2. 实时监控鼠标位置（用于调试和定位）")
    print("\n使用方法：")
    print("- 打开Trae软件，找到@SOLO Coder输入框")
    print("- 运行此脚本，选择功能1")
    print("- 在倒计时结束前将鼠标移动到输入框上")
    print("- 将获取到的坐标填入自动化脚本的配置中")
    
    while True:
        print("\n" + "-" * 50)
        print("请选择功能：")
        print("1. 倒计时获取坐标（5秒）")
        print("2. 自定义倒计时秒数")
        print("3. 实时监控鼠标位置")
        print("4. 退出")
        
        choice = input("\n请输入选项 (1-4): ").strip()
        
        if choice == '1':
            get_position_with_countdown(5)
        elif choice == '2':
            try:
                seconds = int(input("请输入倒计时秒数: "))
                get_position_with_countdown(seconds)
            except ValueError:
                print("请输入有效的数字")
        elif choice == '3':
            continuous_monitor()
        elif choice == '4':
            print("退出程序")
            break
        else:
            print("无效的选项，请重新选择")

if __name__ == "__main__":
    main()
