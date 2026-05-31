from django.contrib import admin

from ...models import SkillChatMessage, SkillChatThread, SkillMatch, SkillSwapProfile


@admin.register(SkillSwapProfile)
class SkillSwapProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'updated_at']
    search_fields = ['user__email', 'user__username', 'teach_skills', 'learn_skills']


@admin.register(SkillMatch)
class SkillMatchAdmin(admin.ModelAdmin):
    list_display = ['matched_skill', 'teaching_user', 'learning_user', 'is_active', 'updated_at']
    search_fields = ['matched_skill', 'teaching_user__email', 'learning_user__email']
    list_filter = ['is_active', 'matched_skill']


@admin.register(SkillChatThread)
class SkillChatThreadAdmin(admin.ModelAdmin):
    list_display = ['match', 'last_message_at', 'updated_at']
    search_fields = ['match__matched_skill', 'match__teaching_user__email', 'match__learning_user__email']


@admin.register(SkillChatMessage)
class SkillChatMessageAdmin(admin.ModelAdmin):
    list_display = ['thread', 'sender', 'created_at']
    search_fields = ['thread__match__matched_skill', 'sender__email', 'body']

