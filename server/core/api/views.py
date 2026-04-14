from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Course, Assessment, Enrollment, Certificate, Review, Comment
from .serializer import CourseSerializer, AssessmentViewSet, EnrollmentViewSet, CertificateViewSet, ReviewViewSet, CommentViewSet  
from .pagination import DefaultPagination
from rest_framework import viewsets



# Create your views here.
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by('-id')
    serializer_class = CourseSerializer
    pagination_class = DefaultPagination




