#!/usr/bin/env python3
"""
docx 导出样式验收脚本
用法：python3 scripts/verify-export-styles.py [docx文件路径]

功能：
- 读取 docx 文件，分析所有段落的样式
- 输出格式化报告：字体/字号/颜色/对齐/行间距/缩进
- 可用于验收排版功能的导出效果
"""

import sys
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Twips

def pt_to_chinese_size(pt):
    """将磅值转换为中文字号名称"""
    if pt is None:
        return None
    chinese_sizes = [
        (42, '初号'), (36, '小初'), (26, '一号'), (24, '小一'),
        (22, '二号'), (18, '小二'), (16, '三号'), (15, '小三'),
        (14, '四号'), (12, '小四'), (10.5, '五号'), (9, '小五'),
    ]
    for size, name in chinese_sizes:
        if abs(pt - size) < 0.5:
            return f'{name}({pt}pt)'
    return f'{pt}pt'

def rgb_to_hex(rgb):
    """将 RGBColor 转为十六进制字符串"""
    if rgb is None:
        return None
    return f'#{rgb}'

def alignment_name(align):
    """对齐方式名称"""
    names = {
        None: '默认',
        0: '左对齐',
        1: '居中',
        2: '右对齐',
        3: '两端对齐',
    }
    return names.get(align, f'未知({align})')

def analyze_paragraph(p, idx):
    """分析单个段落的样式"""
    result = {
        'index': idx,
        'text': p.text[:60] + ('...' if len(p.text) > 60 else ''),
        'full_text': p.text,
        'style': p.style.name,
        'alignment': alignment_name(p.alignment),
        'runs': [],
        'paragraph_format': {},
    }
    
    # 段落格式
    pf = p.paragraph_format
    if pf.line_spacing:
        result['paragraph_format']['行间距'] = pf.line_spacing
    if pf.first_line_indent:
        indent_pt = pf.first_line_indent.pt if hasattr(pf.first_line_indent, 'pt') else pf.first_line_indent
        result['paragraph_format']['首行缩进'] = f'{indent_pt}pt'
    if pf.space_before:
        result['paragraph_format']['段前'] = f'{pf.space_before.pt}pt'
    if pf.space_after:
        result['paragraph_format']['段后'] = f'{pf.space_after.pt}pt'
    
    # 每个 run 的样式
    for r in p.runs:
        run_info = {
            'text': r.text[:30] + ('...' if len(r.text) > 30 else ''),
            'font': r.font.name,
            'size': pt_to_chinese_size(r.font.size.pt if r.font.size else None),
            'bold': r.bold,
            'italic': r.italic,
            'underline': r.underline,
            'color': rgb_to_hex(r.font.color.rgb) if r.font.color.rgb else None,
        }
        result['runs'].append(run_info)
    
    return result

def print_report(results, doc_path):
    """打印格式化报告"""
    print('=' * 60)
    print(f'📄 docx 导出样式验收报告')
    print(f'   文件: {doc_path}')
    print(f'   段落数: {len(results)}')
    print('=' * 60)
    
    for r in results:
        print(f'\n【段落 {r["index"]}】 {r["style"]}')
        print(f'  文本: {r["text"]}')
        print(f'  对齐: {r["alignment"]}')
        
        if r['paragraph_format']:
            pf_str = ' | '.join([f'{k}: {v}' for k, v in r['paragraph_format'].items()])
            print(f'  段落格式: {pf_str}')
        
        for i, run in enumerate(r['runs']):
            styles = []
            if run['font']:
                styles.append(f'字体:{run["font"]}')
            if run['size']:
                styles.append(f'字号:{run["size"]}')
            if run['bold']:
                styles.append('加粗')
            if run['italic']:
                styles.append('斜体')
            if run['underline']:
                styles.append('下划线')
            if run['color']:
                styles.append(f'颜色:{run["color"]}')
            
            style_str = ', '.join(styles) if styles else '无特殊样式'
            print(f'  └─ run {i}: "{run["text"]}" → {style_str}')
    
    print('\n' + '=' * 60)
    print('✅ 验收完成')
    print('=' * 60)

def main():
    if len(sys.argv) < 2:
        # 默认路径
        doc_path = Path('/tmp/exported.docx')
        if not doc_path.exists():
            print('用法: python3 scripts/verify-export-styles.py <docx文件路径>')
            sys.exit(1)
    else:
        doc_path = Path(sys.argv[1])
    
    if not doc_path.exists():
        print(f'❌ 文件不存在: {doc_path}')
        sys.exit(1)
    
    try:
        doc = Document(str(doc_path))
    except Exception as e:
        print(f'❌ 无法读取文件: {e}')
        sys.exit(1)
    
    results = []
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip():  # 只分析非空段落
            results.append(analyze_paragraph(p, i))
    
    if not results:
        print('⚠️ 文档没有非空段落')
        sys.exit(0)
    
    print_report(results, doc_path)

if __name__ == '__main__':
    main()
