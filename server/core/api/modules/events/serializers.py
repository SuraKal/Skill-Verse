from rest_framework import serializers

from ...models import (
    CoOrganizerStatus,
    Event,
    EventCoOrganizer,
    EventInviteStatus,
    EventParticipant,
    EventRole,
    EventStatus,
    EventVisibility,
    InvitationToken,
    InviteOrigin,
    Organization,
)
from ...serializers import OrganizationSerializer, UserSerializer


class EventLifecycleSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id',
            'organization',
            'title',
            'description',
            'cover_image',
            'location',
            'start_datetime',
            'end_datetime',
            'timezone',
            'visibility',
            'status',
            'rejection_note',
            'created_by',
            'created_at',
            'updated_at',
        ]


class EventRejectSerializer(serializers.Serializer):
    rejection_note = serializers.CharField(allow_blank=False, trim_whitespace=True)


class EventWriteSerializer(serializers.Serializer):
    organization_id = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    cover_image = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(max_length=255)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    timezone = serializers.CharField(max_length=64)
    visibility = serializers.ChoiceField(choices=EventVisibility.choices)

    def validate(self, attrs):
        start_datetime = attrs.get('start_datetime')
        end_datetime = attrs.get('end_datetime')
        if start_datetime is not None and end_datetime is not None and end_datetime <= start_datetime:
            raise serializers.ValidationError({'end_datetime': 'End datetime must be after start datetime.'})
        return attrs


class EventParticipantInvitationWriteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    event_role = serializers.ChoiceField(
        choices=[
            (EventRole.ATTENDEE, EventRole.ATTENDEE.label),
            (EventRole.SPEAKER, EventRole.SPEAKER.label),
            (EventRole.VOLUNTEER, EventRole.VOLUNTEER.label),
            (EventRole.GUEST, EventRole.GUEST.label),
        ]
    )

    def validate_email(self, value):
        return value.lower().strip()


class EventParticipantRoleUpdateSerializer(serializers.Serializer):
    event_role = serializers.ChoiceField(
        choices=[
            (EventRole.ADMIN, EventRole.ADMIN.label),
            (EventRole.ATTENDEE, EventRole.ATTENDEE.label),
            (EventRole.SPEAKER, EventRole.SPEAKER.label),
            (EventRole.VOLUNTEER, EventRole.VOLUNTEER.label),
            (EventRole.GUEST, EventRole.GUEST.label),
        ]
    )


class EventCoOrganizerInvitationWriteSerializer(serializers.Serializer):
    contact_email = serializers.EmailField()
    organization_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_contact_email(self, value):
        return value.lower().strip()


class EventParticipantInvitationSerializer(serializers.ModelSerializer):
    token = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(source='event.organization.id', read_only=True)
    organization_name = serializers.CharField(source='event.organization.name', read_only=True)
    event_id = serializers.UUIDField(source='event.id', read_only=True)
    event_name = serializers.CharField(source='event.title', read_only=True)
    invited_by = UserSerializer(read_only=True)
    user = UserSerializer(read_only=True, allow_null=True)
    accept_url = serializers.SerializerMethodField()
    decline_url = serializers.SerializerMethodField()
    registration_url = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = EventParticipant
        fields = [
            'id',
            'token',
            'event_id',
            'event_name',
            'organization_id',
            'organization_name',
            'email',
            'user',
            'event_role',
            'invite_status',
            'invite_origin',
            'invited_by',
            'invited_at',
            'responded_at',
            'accept_url',
            'decline_url',
            'registration_url',
            'is_expired',
        ]

    def _get_token(self, obj):
        token = getattr(obj, '_prefetched_invitation_token', None)
        if token is None:
            prefetched_tokens = getattr(obj, 'prefetched_tokens', None)
            if prefetched_tokens is not None:
                token = prefetched_tokens[0] if prefetched_tokens else None
            else:
                token = obj.tokens.order_by('-created_at').first()
        return token

    def get_token(self, obj):
        token = self._get_token(obj)
        return token.token if token else ''

    def get_accept_url(self, obj):
        token = self._get_token(obj)
        frontend_url = self.context.get('frontend_url', '')
        return f'{frontend_url.rstrip("/")}/invitations/participant/{token.token}/accept' if token else ''

    def get_decline_url(self, obj):
        token = self._get_token(obj)
        frontend_url = self.context.get('frontend_url', '')
        return f'{frontend_url.rstrip("/")}/invitations/participant/{token.token}/decline' if token else ''

    def get_registration_url(self, obj):
        token = self._get_token(obj)
        frontend_url = self.context.get('frontend_url', '')
        if token is None:
            return ''
        return f'{frontend_url.rstrip("/")}/register?event_invitation_token={token.token}&type=participant'

    def get_is_expired(self, obj):
        token = self._get_token(obj)
        return bool(token and token.is_expired)


class EventCoOrganizerInvitationSerializer(serializers.ModelSerializer):
    token = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(source='organization.id', read_only=True, allow_null=True)
    organization_name = serializers.SerializerMethodField()
    event_id = serializers.UUIDField(source='event.id', read_only=True)
    event_name = serializers.CharField(source='event.title', read_only=True)
    invited_by_user = UserSerializer(read_only=True)
    accept_url = serializers.SerializerMethodField()
    decline_url = serializers.SerializerMethodField()
    registration_url = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = EventCoOrganizer
        fields = [
            'id',
            'token',
            'event_id',
            'event_name',
            'organization_id',
            'organization_name',
            'invite_email',
            'status',
            'invited_by_user',
            'invited_at',
            'responded_at',
            'accept_url',
            'decline_url',
            'registration_url',
            'is_expired',
        ]

    def _get_token(self, obj):
        token = getattr(obj, '_prefetched_invitation_token', None)
        if token is None:
            prefetched_tokens = getattr(obj, 'prefetched_tokens', None)
            if prefetched_tokens is not None:
                token = prefetched_tokens[0] if prefetched_tokens else None
            else:
                token = obj.tokens.order_by('-created_at').first()
        return token

    def get_token(self, obj):
        token = self._get_token(obj)
        return token.token if token else ''

    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization_id else ''

    def get_accept_url(self, obj):
        token = self._get_token(obj)
        frontend_url = self.context.get('frontend_url', '')
        return f'{frontend_url.rstrip("/")}/invitations/co-organizer/{token.token}/accept' if token else ''

    def get_decline_url(self, obj):
        token = self._get_token(obj)
        frontend_url = self.context.get('frontend_url', '')
        return f'{frontend_url.rstrip("/")}/invitations/co-organizer/{token.token}/decline' if token else ''

    def get_registration_url(self, obj):
        token = self._get_token(obj)
        frontend_url = self.context.get('frontend_url', '')
        if token is None:
            return ''
        return f'{frontend_url.rstrip("/")}/register?event_invitation_token={token.token}&type=co_organizer'

    def get_is_expired(self, obj):
        token = self._get_token(obj)
        return bool(token and token.is_expired)
