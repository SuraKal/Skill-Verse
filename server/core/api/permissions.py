from rest_framework import permissions

from .models import Invitation, Membership, OrganizationRole


class HasOrganizationReadAccess(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return Membership.objects.filter(user=request.user, organization=obj).exists()


class HasOrganizationManagementAccess(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return Membership.objects.filter(
            user=request.user,
            organization=obj,
            role__in=[OrganizationRole.CREATOR, OrganizationRole.MANAGER],
        ).exists()


class IsInvitationRecipient(permissions.BasePermission):
    def has_permission(self, request, view):
        token = view.kwargs.get('token')
        invitation = Invitation.objects.filter(token=token).first()
        if invitation is None:
            return False
        return invitation.invited_email.lower() == request.user.email.lower()
