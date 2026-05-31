from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models import SkillChatMessage, SkillChatThread, SkillMatch, SkillSwapProfile
from .permissions import IsSkillSwapThreadParticipant
from .serializers import (
    SkillChatMessageSerializer,
    SkillChatThreadSerializer,
    SkillSwapDashboardSerializer,
    SkillSwapMatchSerializer,
    SkillSwapProfileSerializer,
    SkillSwapProfileUpdateSerializer,
)
from .services import rebuild_skill_matches, split_skill_text


class SkillSwapDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = SkillSwapProfile.objects.filter(user=request.user).first()
        matches = (
            SkillMatch.objects.filter(is_active=True)
            .filter(Q(teaching_user=request.user) | Q(learning_user=request.user))
            .select_related('teaching_user', 'learning_user')
            .prefetch_related('thread__messages__sender')
            .order_by('-updated_at')
        )
        threads = SkillChatThread.objects.filter(
            match__in=matches
        ).select_related(
            'match',
            'match__teaching_user',
            'match__learning_user',
        ).prefetch_related('messages__sender').order_by('-last_message_at', '-created_at')
        payload = {
            'profile': profile,
            'matches': matches,
            'threads': threads,
            'teach_skills': split_skill_text(profile.teach_skills) if profile else [],
            'learn_skills': split_skill_text(profile.learn_skills) if profile else [],
        }
        return Response(SkillSwapDashboardSerializer(payload).data)


class SkillSwapProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = SkillSwapProfile.objects.get_or_create(user=request.user)
        return Response(SkillSwapProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = SkillSwapProfile.objects.get_or_create(user=request.user)
        serializer = SkillSwapProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        rebuild_skill_matches()
        return Response(SkillSwapProfileSerializer(profile).data)


class SkillSwapMatchesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        matches = (
            SkillMatch.objects.filter(is_active=True)
            .filter(Q(teaching_user=request.user) | Q(learning_user=request.user))
            .select_related('teaching_user', 'learning_user')
            .prefetch_related('thread__messages__sender')
            .order_by('-updated_at')
        )
        return Response(SkillSwapMatchSerializer(matches, many=True).data)


class SkillSwapThreadsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        threads = (
            SkillChatThread.objects.filter(match__is_active=True)
            .filter(Q(match__teaching_user=request.user) | Q(match__learning_user=request.user))
            .select_related('match', 'match__teaching_user', 'match__learning_user')
            .prefetch_related('messages__sender')
            .order_by('-last_message_at', '-created_at')
        )
        return Response(SkillChatThreadSerializer(threads, many=True).data)


class SkillSwapThreadMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSkillSwapThreadParticipant]

    def get_thread(self, thread_id):
        return get_object_or_404(
            SkillChatThread.objects.select_related(
                'match',
                'match__teaching_user',
                'match__learning_user',
            ).prefetch_related('messages__sender'),
            id=thread_id,
        )

    def get(self, request, thread_id):
        thread = self.get_thread(thread_id)
        self.check_object_permissions(request, thread)
        return Response(SkillChatThreadSerializer(thread).data)

    def post(self, request, thread_id):
        thread = self.get_thread(thread_id)
        self.check_object_permissions(request, thread)
        body = (request.data.get('body') or '').strip()
        if not body:
            raise serializers.ValidationError({'body': 'Message body cannot be blank.'})
        message = SkillChatMessage.objects.create(thread=thread, sender=request.user, body=body)
        thread.last_message_at = message.created_at
        thread.save(update_fields=['last_message_at', 'updated_at'])
        return Response(SkillChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)
