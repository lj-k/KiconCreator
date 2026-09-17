#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge2ai.py
----------
将指定目录下的文件按类型合并为一个 Markdown 文件，方便粘贴给 AI 进行分析。

输出格式:
    # <根目录文件夹名>
    ## <相对于根目录的文件路径>
    ```<语言>
    <文件内容>
    ```

版本: 0.01

用法示例:
    # 无参运行 —— 使用脚本内置默认配置（V2 目录 + doc/需求文档.md，递归，全部类型）
    python merge2ai.py

    # 合并 V2/js 目录下所有 js 文件（递归）
    python merge2ai.py --root /home/lk/SOURCE/WORK/iconEditor \
                       --paths V2/js \
                       --types js \
                       --recursive \
                       --output merged.md

    # 合并 V2 目录下的所有 md 和 py 文件（仅顶层）
    python merge2ai.py -r /home/lk/SOURCE/WORK/iconEditor \
                       -p V2 doc \
                       -t md py \
                       --no-recursive \
                       -o merged.md
"""

import argparse
import os
import re
import sys
from pathlib import Path


# ---------- 语言推断 ----------
# 常见扩展名 -> Markdown 代码块语言标记
EXT_LANG_MAP = {
    # Web
    '.html': 'html', '.htm': 'html',
    '.css': 'css', '.scss': 'scss', '.less': 'less',
    '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.ts': 'typescript', '.tsx': 'typescript',
    '.json': 'json', '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml',
    '.md': 'markdown', '.markdown': 'markdown',
    # Python
    '.py': 'python', '.pyw': 'python',
    # Shell
    '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
    # 其他
    '.java': 'java', '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.hpp': 'cpp',
    '.rs': 'rust', '.go': 'go', '.rb': 'ruby', '.php': 'php',
    '.sql': 'sql',
    '.txt': 'text', '.log': 'text',
    '.gitignore': 'gitignore',
}


def ext_to_lang(file_path: Path) -> str:
    """根据文件扩展名推断 Markdown 代码块的语言标记。"""
    ext = file_path.suffix.lower()
    # 处理无扩展名但有特殊名称的情况
    if ext == '' and file_path.name in ('.gitignore', '.dockerfile'):
        return EXT_LANG_MAP.get(file_path.name, 'text')
    return EXT_LANG_MAP.get(ext, '')


# ---------- 自然排序 ----------
_ns_re = re.compile(r'(\d+)')


def natural_sort_key(text: str):
    """将字符串按数字分段，实现自然排序（file2 < file10）。"""
    return [int(s) if s.isdigit() else s.lower() for s in _ns_re.split(text)]


# ---------- 文件收集 ----------
def collect_files(root: Path, paths, extensions, recursive: bool):
    """
    根据参数收集待合并文件。

    参数:
        root:       根目录绝对路径
        paths:      相对 root 的路径列表（可以是文件或目录）
        extensions: 扩展名集合（如 {'.js', '.py'}），空集合或 {'*'} 表示全部
        recursive:  目录是否递归搜索子文件夹

    返回:
        绝对路径的 Path 对象列表，已按自然排序。
    """
    all_files = []
    accept_all = ('*' in extensions)

    for rel in paths:
        target = (root / rel).resolve()
        if not target.exists():
            print(f"[警告] 路径不存在，已跳过: {target}", file=sys.stderr)
            continue

        if target.is_file():
            all_files.append(target)
        elif target.is_dir():
            if recursive:
                iterator = target.rglob('*')
            else:
                iterator = target.iterdir()
            for p in iterator:
                if p.is_file():
                    all_files.append(p)
        else:
            print(f"[警告] 非文件/目录，已跳过: {target}", file=sys.stderr)

    # 按扩展名过滤（如果不是全部）
    if not accept_all and extensions:
        all_files = [f for f in all_files if f.suffix.lower() in extensions]

    # 去重（同一文件可能被多个 path 命中）
    all_files = list(dict.fromkeys(all_files))

    # 自然排序（先按相对路径排）
    all_files.sort(key=lambda p: natural_sort_key(str(p.relative_to(root))))

    return all_files


# ---------- 内容读取 ----------
def read_file_content(file_path: Path) -> str:
    """读取文件内容，尽量用 utf-8，失败则尝试 gbk，最后用 latin-1 兜底。"""
    for enc in ('utf-8', 'utf-8-sig', 'gbk', 'gb18030', 'latin-1'):
        try:
            return file_path.read_text(encoding=enc)
        except (UnicodeDecodeError, UnicodeError):
            continue
    # 最后兜底：用 latin-1 不会抛异常
    return file_path.read_text(encoding='latin-1')


# ---------- Markdown 生成 ----------
def build_markdown(root: Path, files) -> str:
    """将收集到的文件列表拼接成最终的 Markdown 字符串。"""
    root_name = root.name if root.name else str(root)
    lines = [f"# {root_name}", ""]

    for f in files:
        try:
            rel_path = f.relative_to(root)
        except ValueError:
            # 文件不在 root 下（例如用了绝对路径），退回用绝对路径名
            rel_path = f

        lang = ext_to_lang(f)
        content = read_file_content(f)

        lines.append(f"## {rel_path}")
        lines.append("")
        lines.append(f"```{lang}")
        lines.append(content.rstrip())
        lines.append("```")
        lines.append("")

    return "\n".join(lines)


# ---------- 默认配置（无参数运行时使用） ----------
# 改这里即可自定义默认行为
_DEFAULTS = {
    # 根目录：脚本所在项目根（merge2ai/ 的上一级）
    'root': str(Path(__file__).resolve().parent.parent),
    # 要合并的路径列表（相对于根目录，可为目录或文件）
    'paths': ['V2', 'doc/需求文档.md'],
    # 文件类型（扩展名列表；'*' 表示全部）
    'types': ['*'],
    # 是否递归搜索子文件夹
    'recursive': True,
    # 输出文件路径（相对于运行时 cwd 或绝对路径）
    'output': 'merge2ai/merged.md',
}


# ---------- 入口 ----------
def parse_args():
    parser = argparse.ArgumentParser(
        description='将指定目录下的文件按类型合并为一个 Markdown 文件（无参数则使用内置默认配置）',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
无参运行:
  python merge2ai.py        # 使用脚本顶部 _DEFAULTS 中的默认配置

示例:
  %(prog)s -r ./project -p src -t py --recursive -o merged.md
  %(prog)s -r ./project -p docs README.md -t md '*' -o merged.md
        """,
    )

    parser.add_argument('-r', '--root', default=None,
                        help='根目录路径（绝对或相对）')
    parser.add_argument('-p', '--paths', nargs='+', default=None,
                        help='要合并的路径列表（相对于根目录，可为文件或目录）')
    parser.add_argument('-t', '--types', nargs='+', default=None,
                        help='文件类型列表（扩展名，如 js py；* 表示全部类型）')
    parser.add_argument('--recursive', action='store_true', default=None,
                        help='递归搜索子文件夹')
    parser.add_argument('--no-recursive', action='store_true', default=None,
                        help='不递归（覆盖默认 recursive=True）')
    parser.add_argument('-o', '--output', default=None,
                        help='输出 Markdown 文件路径')

    return parser.parse_args()


def main():
    args = parse_args()

    # 用命令行参数覆盖默认值；命令行没给的就用 _DEFAULTS
    root_str = args.root if args.root is not None else _DEFAULTS['root']
    paths   = args.paths if args.paths is not None else _DEFAULTS['paths']
    types   = args.types if args.types is not None else _DEFAULTS['types']
    if args.recursive is not None:
        recursive = True
    elif args.no_recursive is not None:
        recursive = False
    else:
        recursive = _DEFAULTS['recursive']
    output  = args.output if args.output is not None else _DEFAULTS['output']

    root = Path(root_str).resolve()
    if not root.is_dir():
        print(f"[错误] 根目录不存在或不是目录: {root}", file=sys.stderr)
        sys.exit(1)

    # 归一化扩展名: 统一成小写并加上前导点
    raw_types = set(t.lower() for t in types)
    extensions = set()
    for t in raw_types:
        if t == '*':
            extensions.add('*')
        else:
            extensions.add(t if t.startswith('.') else '.' + t)

    files = collect_files(root, paths, extensions, recursive)

    if not files:
        print("[警告] 未找到任何匹配的文件，输出将只有标题。", file=sys.stderr)

    print(f"[信息] 根目录     : {root}")
    print(f"[信息] 目标路径   : {paths}")
    print(f"[信息] 文件类型   : {types}")
    print(f"[信息] 递归搜索   : {'是' if recursive else '否'}")
    print(f"[信息] 匹配文件数 : {len(files)}")
    for f in files:
        print(f"        - {f.relative_to(root)}")

    md_content = build_markdown(root, files)

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(md_content, encoding='utf-8')

    print(f"[完成] 已写入 -> {output_path.resolve()}")


if __name__ == '__main__':
    main()
