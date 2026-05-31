from django.contrib import admin

from ...models import Invitation, Membership, Organization, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'active_organization', 'updated_at')
    search_fields = ('user__username', 'user__email', 'title')


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'is_verified', 'email', 'phone', 'created_at')
    search_fields = ('name', 'email', 'phone', 'owner__email')
    list_filter = ('is_verified',)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('user__email', 'organization__name')


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('invited_email', 'organization', 'role', 'status', 'date_sent', 'expires_at')
    list_filter = ('role', 'status')
    search_fields = ('invited_email', 'organization__name', 'invited_by__email')
