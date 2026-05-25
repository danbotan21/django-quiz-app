from rest_framework import serializers
from .models import Quiz, QuizQuestion, Answer


class QuizAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'text', 'is_correct']
        read_only_fields = ['id']


class QuizQuestionSerializer(serializers.ModelSerializer):
    answers = QuizAnswerSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'questionQuiz', 'correctAnswer', 'answers', 'quiz']
        read_only_fields = ['id']


class QuizSerializer(serializers.ModelSerializer):
    """Basic serializer for Quiz model"""
    class Meta:
        model = Quiz
        fields = ['id', 'titleQuiz', 'numberOfQuestions', 'difficulty', 'time', 'scoreToPass']
        read_only_fields = ['id']


class QuizListSerializer(serializers.ModelSerializer):
    """Simplified serializer for quiz list"""
    class Meta:
        model = Quiz
        fields = ['id', 'titleQuiz', 'numberOfQuestions', 'difficulty', 'time', 'scoreToPass']
        read_only_fields = ['id']


class QuizDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single quiz with questions"""
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'titleQuiz', 'numberOfQuestions', 'difficulty', 'time', 'scoreToPass', 'questions']
        read_only_fields = ['id']



        



