from rest_framework import permissions

from ...models import SkillChatThread


class IsSkillSwapThreadParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not isinstance(obj, SkillChatThread):
            return False
        return obj.match.teaching_user_id == request.user.id or obj.match.learning_user_id == request.user.id

