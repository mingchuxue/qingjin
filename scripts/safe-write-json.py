#!/usr/bin/env python3
"""把构建/校验元数据写到交付目录。永远不要写进题库或知识内容 JSON。"""
from __future__ import annotations
import json, os
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
PROTECTED_PREFIXES = (ROOT/'data', ROOT/'assets', ROOT/'collector', ROOT/'android', ROOT/'index.html')
def assert_safe(path: Path) -> Path:
    target = path.expanduser().resolve()
    for prefix in PROTECTED_PREFIXES:
        prefix = prefix.resolve()
        if target==prefix or prefix in target.parents or (prefix.is_file() and target==prefix):
            raise PermissionError(f'拒绝写入内容或运行资源：{target}。构件校验只能写到交付目录。')
    if target.name in {'chinese.json','textbook.json','meta.json'} and 'qingjin' in str(target) and 'content-delivery' not in str(target):
        raise PermissionError(f'拒绝写入内容文件：{target}')
    return target
def write_json(path, obj):
    target = assert_safe(Path(path))
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(target.name + f'.tmp-{os.getpid()}')
    try:
        tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        os.replace(tmp, target)
    finally:
        if tmp.exists():
            tmp.unlink()
    return target
if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser();ap.add_argument('path');ap.add_argument('--stdin',action='store_true')
    args=ap.parse_args();
    write_json(args.path, json.load(__import__('sys').stdin) if args.stdin else {})
