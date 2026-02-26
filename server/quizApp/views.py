from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework import status
from rest_framework import generics
from django.shortcuts import get_object_or_404
from .models import Quiz, QuizQuestion, Answer
from .serializer import QuizSerializer, QuizQuestionSerializer, QuizAnswerSerializer


class SearchForQuizes(viewsets.ModelViewSet):
    """Search quizzes by title"""
    serializer_class = QuizSerializer
    queryset = Quiz.objects.all()

    def list(self, request, *args, **kwargs):
        text_search_bar = request.GET.get('search', '').strip()

        if not text_search_bar:
            return Response(
                {'quizzes': []},
                status=status.HTTP_200_OK
            )

        quizes = Quiz.objects.filter(titleQuiz__icontains=text_search_bar)
        serializer = QuizSerializer(quizes, many=True)
        return Response(data=serializer.data, status=status.HTTP_200_OK)

class QuestionsOfTheQuiz(generics.ListAPIView):
    """Get all questions of a specific quiz with answers"""
    serializer_class = QuizQuestionSerializer
    
    def get_queryset(self):
        quiz_id = self.request.GET.get('id')
        
        if not quiz_id:
            return QuizQuestion.objects.none()
        
        # Verify quiz exists
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        return QuizQuestion.objects.filter(quiz=quiz).prefetch_related('answers')




class GetQuiz(APIView):
    """Get a specific quiz by ID"""
    
    def get(self, request, *args, **kwargs):
        quiz_id = request.GET.get('id')
        
        if not quiz_id:
            return Response(
                {'error': 'Quiz ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quiz = Quiz.objects.get(pk=quiz_id)
            serializer = QuizSerializer(quiz)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Quiz.DoesNotExist:
            return Response(
                {'error': 'Quiz not found'},
                status=status.HTTP_404_NOT_FOUND
            )