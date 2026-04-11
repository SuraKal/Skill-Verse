from rest_framework import serializers
from .models import Course

# Turns the data into JSON format and vice versa
class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'

