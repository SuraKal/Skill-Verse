from rest_framework import serializers

from ...models import SkillChatMessage, SkillChatThread, SkillMatch, SkillSwapProfile
from ...serializers import UserSerializer
from .services import split_skill_text


class SkillSwapProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    teach_skills_list = serializers.SerializerMethodField()
    learn_skills_list = serializers.SerializerMethodField()

    class Meta:
        model = SkillSwapProfile
        fields = [
            'id',
            'user',
            'teach_skills',
            'learn_skills',
            'summary',
            'teach_skills_list',
            'learn_skills_list',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'teach_skills_list', 'learn_skills_list', 'created_at', 'updated_at']

    def get_teach_skills_list(self, obj):
        return split_skill_text(obj.teach_skills)

    def get_learn_skills_list(self, obj):
        return split_skill_text(obj.learn_skills)


class SkillSwapProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillSwapProfile
        fields = ['teach_skills', 'learn_skills', 'summary']


class SkillSwapMatchSerializer(serializers.ModelSerializer):
    teaching_user = UserSerializer(read_only=True)
    learning_user = UserSerializer(read_only=True)
    chat_thread_id = serializers.SerializerMethodField()

    class Meta:
        model = SkillMatch
        fields = [
            'id',
            'teaching_user',
            'learning_user',
            'matched_skill',
            'teaching_text',
            'learning_text',
            'match_score',
            'is_active',
            'chat_thread_id',
            'created_at',
            'updated_at',
        ]

    def get_chat_thread_id(self, obj):
        thread = getattr(obj, 'thread', None)
        return str(thread.id) if thread else None


class SkillChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = SkillChatMessage
        fields = ['id', 'thread', 'sender', 'body', 'created_at', 'updated_at']
        read_only_fields = ['id', 'thread', 'sender', 'created_at', 'updated_at']


class SkillChatThreadSerializer(serializers.ModelSerializer):
    match = SkillSwapMatchSerializer(read_only=True)
    messages = SkillChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = SkillChatThread
        fields = ['id', 'match', 'last_message_at', 'messages', 'created_at', 'updated_at']
        read_only_fields = ['id', 'match', 'last_message_at', 'messages', 'created_at', 'updated_at']


class SkillSwapDashboardSerializer(serializers.Serializer):
    profile = SkillSwapProfileSerializer(allow_null=True)
    matches = SkillSwapMatchSerializer(many=True)
    threads = SkillChatThreadSerializer(many=True)
    stats = serializers.SerializerMethodField()

    def get_stats(self, obj):
        profile = obj['profile']
        teach_count = len(obj['teach_skills'])
        learn_count = len(obj['learn_skills'])
        return {
            'teach_count': teach_count,
            'learn_count': learn_count,
            'match_count': len(obj['matches']),
            'thread_count': len(obj['threads']),
            'profile_completed': bool(profile and (profile.teach_skills.strip() or profile.learn_skills.strip())),
        }
