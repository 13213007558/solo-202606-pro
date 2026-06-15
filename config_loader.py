from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"


def load_config() -> dict[str, Any]:
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as file:
            config = json.load(file)
    except FileNotFoundError as exc:
        raise RuntimeError(f"Configuration file not found: {CONFIG_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON in {CONFIG_PATH}: {exc}") from exc
    if not isinstance(config, dict):
        raise RuntimeError(f"Configuration root must be an object: {CONFIG_PATH}")
    return config


CONFIG = load_config()


def get_config(path: str, default: Any = None) -> Any:
    value: Any = CONFIG
    for key in path.split("."):
        if not isinstance(value, dict) or key not in value:
            return default
        value = value[key]
    return value


def get_path(path: str, default: str | None = None) -> Path:
    value = get_config(path, default)
    if not value:
        raise RuntimeError(f"Missing path configuration: {path}")
    result = Path(str(value)).expanduser()
    return result if result.is_absolute() else BASE_DIR / result


def get_deepseek_config(required: bool = False) -> tuple[str, str, str]:
    api_key = os.getenv("DEEPSEEK_API_KEY") or str(get_config("deepseek.api_key", ""))
    base_url = os.getenv("DEEPSEEK_BASE_URL") or str(
        get_config("deepseek.base_url", "")
    )
    model = os.getenv("DEEPSEEK_MODEL") or str(get_config("deepseek.model", ""))
    if required:
        missing = []
        if not api_key.strip():
            missing.append("api_key")
        if not base_url.strip():
            missing.append("base_url")
        if not model.strip():
            missing.append("model")
        if missing:
            raise RuntimeError(
                "DeepSeek 配置不完整，缺少: "
                + ", ".join(missing)
                + f"。请修改 {CONFIG_PATH} 中的 deepseek 配置，"
                + "或设置 DEEPSEEK_API_KEY、DEEPSEEK_BASE_URL、"
                + "DEEPSEEK_MODEL 环境变量。"
            )
    return api_key, base_url, model
