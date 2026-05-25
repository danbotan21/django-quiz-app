from django.contrib import admin
from .models import Quiz, QuizQuestion, Answer


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['titleQuiz', 'numberOfQuestions', 'difficulty', 'time', 'scoreToPass']
    list_filter = ['difficulty']
    search_fields = ['titleQuiz']


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ['get_question_preview', 'quiz', 'correctAnswer']
    list_filter = ['quiz']
    search_fields = ['questionQuiz', 'quiz__titleQuiz']

    def get_question_preview(self, obj):
        return obj.questionQuiz[:50] + '...' if len(obj.questionQuiz) > 50 else obj.questionQuiz
    get_question_preview.short_description = 'Question'


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['text', 'question', 'is_correct']
    list_filter = ['is_correct']
    search_fields = ['text', 'question__questionQuiz']
