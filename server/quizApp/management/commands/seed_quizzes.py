import random

from django.core.management.base import BaseCommand
from django.db import transaction

from quizApp.models import Answer, Quiz, QuizQuestion

# (title, difficulty, minutes, score to pass, [(question, correct answer, [wrong answers])])
DEMO_QUIZZES = [
    ('Python Basics', 'easy', 5, 60, [
        ('Which keyword defines a function in Python?', 'def', ['func', 'function', 'lambda']),
        ('What does len([1, 2, 3]) return?', '3', ['2', '4', 'An error']),
        ('Which type is immutable?', 'tuple', ['list', 'dict', 'set']),
        ('How do you start a comment in Python?', '#', ['//', '--', '/*']),
        ('What is the result of 7 // 2?', '3', ['3.5', '4', '2']),
    ]),
    ('JavaScript Fundamentals', 'medium', 7, 60, [
        ('Which keyword declares a block-scoped variable?', 'let', ['var', 'define', 'global']),
        ('What does typeof null return?', 'object', ['null', 'undefined', 'number']),
        ('Which method adds an item to the end of an array?', 'push()', ['pop()', 'shift()', 'append()']),
        ('What does === compare?', 'Value and type', ['Only value', 'Only type', 'Memory address']),
        ('Which function parses a JSON string?', 'JSON.parse()', ['JSON.stringify()', 'parseJSON()', 'JSON.read()']),
    ]),
    ('SQL Essentials', 'medium', 7, 60, [
        ('Which clause filters rows?', 'WHERE', ['ORDER BY', 'GROUP BY', 'SELECT']),
        ('Which command removes all rows but keeps the table?', 'TRUNCATE', ['DROP', 'DELETE TABLE', 'REMOVE']),
        ('Which join returns only matching rows?', 'INNER JOIN', ['LEFT JOIN', 'FULL JOIN', 'CROSS JOIN']),
        ('Which function counts rows?', 'COUNT()', ['SUM()', 'TOTAL()', 'NUM()']),
        ('Which keyword removes duplicate rows from a result?', 'DISTINCT', ['UNIQUE', 'SINGLE', 'ONLY']),
    ]),
    ('Git & GitHub', 'hard', 6, 70, [
        ('Which command creates a new branch and switches to it?', 'git switch -c', ['git branch -m', 'git checkout --orphan', 'git new']),
        ('Which command shows unstaged changes?', 'git diff', ['git log', 'git status -s', 'git show']),
        ('What does git fetch do?', 'Downloads remote changes without merging', ['Merges remote changes', 'Pushes local commits', 'Deletes remote branches']),
        ('Which file lists paths Git should not track?', '.gitignore', ['.gitkeep', '.gitconfig', '.gitattributes']),
        ('Which command undoes a pushed commit safely?', 'git revert', ['git reset --hard', 'git rm', 'git clean']),
    ]),
    ('HTML & CSS', 'easy', 5, 50, [
        ('Which tag creates a link?', '<a>', ['<link>', '<href>', '<url>']),
        ('Which CSS property changes the text color?', 'color', ['font-color', 'text-color', 'foreground']),
        ('Which display value puts items in a flexible row or column?', 'flex', ['block', 'inline', 'table']),
        ('Which unit is relative to the root font size?', 'rem', ['em', 'px', 'vh']),
        ('Which tag holds the main content of a page?', '<main>', ['<body>', '<section>', '<content>']),
    ]),
    ('React Basics', 'hard', 8, 70, [
        ('Which hook stores local component state?', 'useState', ['useEffect', 'useRef', 'useMemo']),
        ('When does useEffect with an empty dependency array run?', 'Once, after the first render', ['On every render', 'Before the first render', 'Never']),
        ('What must every item in a rendered list have?', 'A unique key prop', ['An id attribute', 'A className', 'A ref']),
        ('How do you pass data from a parent to a child?', 'Props', ['State', 'Context only', 'Refs']),
        ('What does JSX compile to?', 'React.createElement calls', ['HTML strings', 'Web components', 'JSON']),
    ]),
]


class Command(BaseCommand):
    help = 'Fill the database with demo quizzes (safe to run more than once).'

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        for title, difficulty, minutes, score, questions in DEMO_QUIZZES:
            if Quiz.objects.filter(titleQuiz=title).exists():
                continue
            quiz = Quiz.objects.create(titleQuiz=title, numberOfQuestions=len(questions),
                                       difficulty=difficulty, time=minutes, scoreToPass=score)
            for text, correct, wrong in questions:
                question = QuizQuestion.objects.create(quiz=quiz, questionQuiz=text, correctAnswer=correct)
                options = [(correct, True)] + [(w, False) for w in wrong]
                random.Random(text).shuffle(options)  # same order on every run, correct one not always first
                Answer.objects.bulk_create(Answer(question=question, text=t, is_correct=ok) for t, ok in options)
            created += 1
        self.stdout.write(self.style.SUCCESS(f'Added {created} demo quizzes.'))
