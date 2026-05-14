#!/usr/bin/env python3
"""Add main_category and sub_category to legacy _notes files that only have discipline.

Files with `discipline:` but no `main_category:` get:
  - main_category: "学习资料"
  - sub_category: <value from existing course: field>
"""

import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_DIR = os.path.join(REPO_ROOT, '_notes')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file has discipline but no main_category
    if 'discipline:' not in content:
        return False
    if 'main_category:' in content:
        return False

    # Extract the course value
    course_match = re.search(r'^course:\s*(.+)$', content, re.MULTILINE)
    course_value = course_match.group(1).strip().strip('"') if course_match else None

    # Find where to insert main_category and sub_category
    # Insert after the layout: line (which every file has)
    layout_match = re.search(r'^(layout:\s*.+)$', content, re.MULTILINE)
    if not layout_match:
        print(f"  SKIP: no layout line in {filepath}")
        return False

    insert_pos = layout_match.end()

    new_lines = '\nmain_category: "学习资料"'
    if course_value:
        new_lines += f'\nsub_category: "{course_value}"'

    new_content = content[:insert_pos] + new_lines + content[insert_pos:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  UPDATED: {os.path.relpath(filepath, NOTES_DIR)} course={course_value}")
    return True

def main():
    count = 0
    for root, dirs, files in os.walk(NOTES_DIR):
        for fn in files:
            if fn.endswith('.md'):
                fp = os.path.join(root, fn)
                if process_file(fp):
                    count += 1
    print(f"\nDone. Updated {count} files.")

if __name__ == '__main__':
    main()
