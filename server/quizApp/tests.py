from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Quiz


class QuizApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_quizzes', verbosity=0)

    def setUp(self):
        self.client = APIClient()

    def test_empty_search_lists_every_quiz(self):
        response = self.client.get('/searchQuizes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), Quiz.objects.count())

    def test_search_is_case_insensitive(self):
        response = self.client.get('/searchQuizes/', {'search': 'PYTHON'})
        self.assertEqual([q['titleQuiz'] for q in response.data], ['Python Basics'])

    def test_quiz_detail(self):
        quiz = Quiz.objects.get(titleQuiz='SQL Essentials')
        response = self.client.get('/quiz/', {'id': quiz.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['difficulty'], 'medium')

    def test_quiz_detail_errors(self):
        self.assertEqual(self.client.get('/quiz/').status_code, 400)
        self.assertEqual(self.client.get('/quiz/', {'id': 9999}).status_code, 404)

    def test_questions_have_one_correct_answer(self):
        quiz = Quiz.objects.get(titleQuiz='Git & GitHub')
        response = self.client.get('/questions/', {'id': quiz.id})
        self.assertEqual(len(response.data), quiz.numberOfQuestions)
        for question in response.data:
            correct = [a['text'] for a in question['answers'] if a['is_correct']]
            self.assertEqual(correct, [question['correctAnswer']])

    def test_seed_command_is_idempotent(self):
        before = Quiz.objects.count()
        call_command('seed_quizzes', verbosity=0)
        self.assertEqual(Quiz.objects.count(), before)
