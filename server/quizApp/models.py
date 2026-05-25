from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Quiz(models.Model):
    titleQuiz = models.CharField(max_length=250)
    numberOfQuestions = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    difficulty = models.CharField(
        max_length=20,
        default='medium',
        choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')]
    )
    time = models.IntegerField(default=10, validators=[MinValueValidator(1)])
    scoreToPass = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.titleQuiz


class QuizQuestion(models.Model):
    questionQuiz = models.TextField()
    correctAnswer = models.CharField(max_length=250)
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.quiz.titleQuiz} - Question {self.id}"


class Answer(models.Model):
    question = models.ForeignKey(QuizQuestion, related_name='answers', on_delete=models.CASCADE)
    text = models.CharField(max_length=250)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.question.questionQuiz[:50]} - {self.text}"
