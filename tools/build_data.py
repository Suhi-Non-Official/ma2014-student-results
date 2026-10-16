"""Build student lookup records from the local grading workbooks. Never uploads sources."""
from pathlib import Path
import base64
import hashlib
import json
import re
from datetime import date
import openpyxl
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'Grades'
SITE = ROOT / 'site'
INDEX = re.compile(r'^\d{6}[A-Z]$')

def clean_id(value):
    return str(value or '').strip().upper()

def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None

def b64(value):
    return base64.b64encode(value).decode('ascii')

def digest(value):
    return hashlib.sha256(value.encode()).digest()

def build():
    students = {}
    issues = []
    roster = openpyxl.load_workbook(next(SOURCE.glob('In24*Grades.xlsx')), data_only=True).active
    for row in list(roster.values)[1:]:
        index = clean_id(row[2])
        if not INDEX.fullmatch(index):
            continue
        if index in students:
            raise ValueError(f'Duplicate roster index: {index}')
        students[index] = {'index': index, 'name': row[0] or None, 'email': row[1] or None,
                           'quizzes': [{'total': number(value), 'parts': None} for value in row[3:8]]}
        if any(q['total'] is not None and not 0 <= q['total'] <= 20 for q in students[index]['quizzes']):
            raise ValueError(f'Roster quiz mark outside 0-20 for {index}')

    layouts = {
        2: (5, [1, 2, 3, 4], [3, 8, 3, 6]),
        3: (8, list(range(1, 8)), [2, 2, 4, 4, 4, 3, 1]),
        4: (8, list(range(1, 8)) + list(range(9, 15)), [2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]),
        5: (8, [1, 2, 3, 4, 6, 7, 8, 9], [2, 2, 4, 2, 2, 4, 2, 2]),
    }
    counts = {}
    for quiz, (start, columns, maxima) in layouts.items():
        sheet = openpyxl.load_workbook(SOURCE / f'Quiz_{quiz}_Student_Marks.xlsx', data_only=True).active
        seen = set()
        for row in list(sheet.values)[start - 1:]:
            index = clean_id(row[0])
            if not INDEX.fullmatch(index):
                if index and any(number(row[c]) is not None for c in columns):
                    issues.append({'quiz': quiz, 'issue': 'Unidentified submission omitted from lookup', 'index': index})
                continue
            if index in seen:
                raise ValueError(f'Duplicate Quiz {quiz} index: {index}')
            seen.add(index)
            parts = [number(row[c]) for c in columns]
            if any(v is None or not 0 <= v <= cap for v, cap in zip(parts, maxima)):
                raise ValueError(f'Invalid Quiz {quiz} component marks for {index}: {parts}')
            total = sum(parts)
            if index not in students:
                students[index] = {'index': index, 'name': None, 'email': None,
                                   'quizzes': [{'total': None, 'parts': None} for _ in range(5)]}
                issues.append({'quiz': quiz, 'index': index, 'issue': 'No matching roster name/email'})
            existing = students[index]['quizzes'][quiz - 1]['total']
            if existing is not None and existing != total:
                raise ValueError(f'Quiz {quiz} total conflict for {index}: roster={existing}, detail={total}')
            students[index]['quizzes'][quiz - 1] = {'total': total, 'parts': parts}
        counts[quiz] = len(seen)

    # Makeup schemes differ from the original papers. Their own tabs preserve
    # the component allocations, and each result occupies its original quiz slot.
    makeup_caps = {
        1: [2,3,3,2,3,2,3,2], 2: [3,8,3,6],
        3: [2,2,4,4,4,3,1], 5: [3,4,3,3,3,4],
    }
    makeup_counts = {}
    for quiz, maxima in makeup_caps.items():
        path = SOURCE / f'Quiz_{quiz}_Student_Marks.xlsx'
        if not path.exists():
            continue
        book = openpyxl.load_workbook(path, data_only=True)
        tab = f'Makeup Quiz {quiz}'
        if tab not in book.sheetnames:
            continue
        seen = set()
        for row in list(book[tab].values)[7:]:
            index = clean_id(row[0])
            if not INDEX.fullmatch(index):
                continue
            if index in seen:
                raise ValueError(f'Duplicate Makeup Quiz {quiz} index: {index}')
            seen.add(index)
            parts = [number(v) for v in row[2:2+len(maxima)]]
            if len(parts) != len(maxima) or any(v is None or not 0 <= v <= cap for v,cap in zip(parts,maxima)):
                raise ValueError(f'Invalid Makeup Quiz {quiz} components for {index}: {parts}')
            total = sum(parts)
            total_column = 2+len(maxima)+(2 if quiz in (1,5) else 0)
            if row[total_column] != total:
                raise ValueError(f'Makeup Quiz {quiz} formula total mismatch: {index}')
            if index not in students:
                raise ValueError(f'Makeup index missing from Grades: {index}')
            existing = students[index]['quizzes'][quiz-1]
            if existing['parts'] is not None or existing['total'] != total:
                raise ValueError(f'Makeup Quiz {quiz} conflicts with existing result for {index}')
            students[index]['quizzes'][quiz-1] = {'total':total,'parts':parts,'type':'makeup'}
        makeup_counts[quiz] = len(seen)

    # No plaintext roster, index list, email list or workbook is included in the site.
    # Index-only access is still not authentication: a known/guessed index opens its record.
    output = SITE / 'records'
    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob('*.json'):
        old.unlink()
    buckets = {f'{i:x}': {} for i in range(16)}
    for index, record in students.items():
        key = digest('ma2014:record:v1:' + index)
        nonce = os.urandom(12)
        payload = json.dumps(record, ensure_ascii=False, separators=(',', ':')).encode()
        cipher = AESGCM(key).encrypt(nonce, payload, None)
        lookup = digest('ma2014:lookup:v1:' + index).hex()
        buckets[lookup[0]][lookup] = {'v': 1, 'iv': b64(nonce), 'data': b64(cipher)}
    for prefix, bucket in buckets.items():
        (output / f'{prefix}.json').write_text(json.dumps(bucket, separators=(',', ':')), encoding='utf8')
    (SITE / 'metadata.json').write_text(json.dumps({'updated': date.today().isoformat(), 'course': 'MA2014'}), encoding='utf8')
    report = {'records': len(students), 'quiz_counts': counts, 'makeup_counts':makeup_counts, 'issues': issues}
    (ROOT / '.local').mkdir(exist_ok=True)
    (ROOT / '.local' / 'data-report.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    build()
