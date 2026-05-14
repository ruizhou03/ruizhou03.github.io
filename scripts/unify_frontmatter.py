#!/usr/bin/env python3
"""Add main_category and sub_category to _notes files that only have discipline."""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_DIR = os.path.join(ROOT, '_notes')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Only touch files with discipline but no main_category
    if 'discipline:' not in content or 'main_category:' in content:
        return False

    # Extract course value
    m = re.search(r'^course:\s*(.+)$', content, re.MULTILINE)
    course_val = m.group(1).strip().strip('"') if m else None

    # Insert after layout: line
    m2 = re.search(r'^(layout:\s*.+)$', content, re.MULTILINE)
    if not m2:
        return False

    insert_at = m2.end()
    new_fields = '\nmain_category: "学习资料"'
    if course_val:
        new_fields += f'\nsub_category: "{course_val}"'

    new_content = content[:insert_at] + new_fields + content[insert_at:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  {os.path.relpath(filepath, NOTES_DIR)}  course={course_val}")
    return True

def main():
    count = 0
    for root, dirs, files in os.walk(NOTES_DIR):
        for fn in files:
            if fn.endswith('.md'):
                if process_file(os.path.join(root, fn)):
                    count += 1
    print(f"\nUpdated {count} files.")

if __name__ == '__main__':
    main()
