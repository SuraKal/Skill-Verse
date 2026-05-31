from django.db.models import Prefetch
from django.http import Http404
from django.conf import settings
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models import (
    Event,
    EventCoOrganizer,
    EventParticipant,
    EventStatus,
    EventVisibility,
    InvitationToken,
    InviteOrigin,
    Organization,
)
from .serializers import (
    EventCoOrganizerInvitationSerializer,
    EventCoOrganizerInvitationWriteSerializer,
    EventParticipantInvitationSerializer,
    EventParticipantInvitationWriteSerializer,
    EventParticipantRoleUpdateSerializer,
    EventLifecycleSerializer,
    EventRejectSerializer,
    EventWriteSerializer,
)
from .services import (
    accept_event_co_organizer_invitation,
    accept_event_participant_invitation,
    archive_event,
    create_event,
    create_event_co_organizer_invitation,
    create_event_participant_invitation,
    decline_event_co_organizer_invitation,
    decline_event_participant_invitation,
    remove_event_co_organizer,
    remove_event_participant,
    register_public_event,
    preview_event_co_organizer_invitation,
    preview_event_participant_invitation,
    approve_event,
    reject_event,
    update_event,
    submit_event_for_approval,
)
from .permissions import (
    can_change_participant_role,
    can_view_event,
    can_view_event_co_organizers,
    can_view_event_participants,
)


class EventPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _serialize_paginated_view(request, queryset, serializer_class, *, frontend_url=None):
    paginator = EventPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(page, many=True, context={'frontend_url': frontend_url or settings.FRONTEND_URL})
    return paginator.get_paginated_response(serializer.data)


def _get_visible_event_or_404(request, event_id):
    event = get_object_or_404(
        Event.objects.select_related('organization', 'created_by'),
        id=event_id,
    )
    email = request.user.email if getattr(request.user, 'is_authenticated', False) else None
    if not can_view_event(request.user, event, email=email):
        raise Http404()
    return event


def _filter_visible_org_events(request, organization):
    events = Event.objects.select_related('organization', 'created_by').filter(organization=organization).order_by('start_datetime', 'created_at')
    email = request.user.email if getattr(request.user, 'is_authenticated', False) else None
    return [event for event in events if can_view_event(request.user, event, email=email)]


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='List public events'),
    post=extend_schema(tags=['Events'], summary='Create event'),
)
class EventCollectionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        events = (
            Event.objects.select_related('organization', 'created_by')
            .filter(visibility=EventVisibility.PUBLIC, status__in={EventStatus.ACTIVE, EventStatus.ONGOING})
            .order_by('start_datetime', 'created_at')
        )
        return _serialize_paginated_view(request, events, EventLifecycleSerializer)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication is required to create events.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = EventWriteSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        event = create_event(
            organization=serializer.validated_data['organization_id'],
            created_by=request.user,
            title=serializer.validated_data['title'],
            description=serializer.validated_data['description'],
            cover_image=serializer.validated_data.get('cover_image'),
            location=serializer.validated_data['location'],
            start_datetime=serializer.validated_data['start_datetime'],
            end_datetime=serializer.validated_data['end_datetime'],
            timezone=serializer.validated_data['timezone'],
            visibility=serializer.validated_data['visibility'],
        )
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='List organization events'),
)
class EventOrganizationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, org_id):
        organization = get_object_or_404(Organization, id=org_id)
        events = _filter_visible_org_events(request, organization)
        return _serialize_paginated_view(request, events, EventLifecycleSerializer)


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='Get event details'),
    patch=extend_schema(tags=['Events'], summary='Edit event details'),
    delete=extend_schema(tags=['Events'], summary='Archive event'),
)
class EventDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request, event_id):
        event = _get_visible_event_or_404(request, event_id)
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_200_OK)

    def patch(self, request, event_id):
        event = _get_visible_event_or_404(request, event_id)
        serializer = EventWriteSerializer(data=request.data or {}, partial=True)
        serializer.is_valid(raise_exception=True)
        event = update_event(
            event=event,
            updated_by=request.user,
            title=serializer.validated_data.get('title'),
            description=serializer.validated_data.get('description'),
            cover_image=serializer.validated_data.get('cover_image'),
            location=serializer.validated_data.get('location'),
            start_datetime=serializer.validated_data.get('start_datetime'),
            end_datetime=serializer.validated_data.get('end_datetime'),
            timezone=serializer.validated_data.get('timezone'),
            visibility=serializer.validated_data.get('visibility'),
        )
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_200_OK)

    def delete(self, request, event_id):
        event = _get_visible_event_or_404(request, event_id)
        event = archive_event(event=event, archived_by=request.user)
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='List event participants'),
)
class EventParticipantListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = _get_visible_event_or_404(request, event_id)
        if not can_view_event_participants(request.user, event):
            return Response({'detail': 'You do not have permission to view participants for this event.'}, status=status.HTTP_403_FORBIDDEN)
        participants = (
            EventParticipant.objects.select_related('event', 'event__organization', 'invited_by', 'user')
            .prefetch_related(Prefetch('tokens', queryset=InvitationToken.objects.order_by('-created_at'), to_attr='prefetched_tokens'))
            .filter(event=event)
            .order_by('-invited_at', 'email')
        )
        return _serialize_paginated_view(request, participants, EventParticipantInvitationSerializer)


@extend_schema_view(
    delete=extend_schema(tags=['Events'], summary='Remove participant'),
)
class EventParticipantDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, event_id, participant_id):
        event = _get_visible_event_or_404(request, event_id)
        participant = get_object_or_404(EventParticipant.objects.select_related('event'), id=participant_id, event=event)
        remove_event_participant(event=event, participant=participant, removed_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='List event co-organizers'),
)
class EventCoOrganizerListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = _get_visible_event_or_404(request, event_id)
        if not can_view_event_co_organizers(request.user, event):
            return Response({'detail': 'You do not have permission to view co-organizers for this event.'}, status=status.HTTP_403_FORBIDDEN)
        co_organizers = (
            EventCoOrganizer.objects.select_related('event', 'event__organization', 'organization', 'invited_by_user')
            .prefetch_related(Prefetch('tokens', queryset=InvitationToken.objects.order_by('-created_at'), to_attr='prefetched_tokens'))
            .filter(event=event)
            .order_by('-invited_at', 'organization__name')
        )
        return _serialize_paginated_view(request, co_organizers, EventCoOrganizerInvitationSerializer)


@extend_schema_view(
    delete=extend_schema(tags=['Events'], summary='Remove co-organizer'),
)
class EventCoOrganizerDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, event_id, co_organizer_id):
        event = _get_visible_event_or_404(request, event_id)
        co_organizer = get_object_or_404(EventCoOrganizer.objects.select_related('event'), id=co_organizer_id, event=event)
        remove_event_co_organizer(event=event, co_organizer=co_organizer, removed_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Self-register for public event'),
)
class EventSelfRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = _get_visible_event_or_404(request, event_id)
        participant = register_public_event(event=event, user=request.user)
        return Response(
            EventParticipantInvitationSerializer(
                participant,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_201_CREATED if participant.invite_origin == InviteOrigin.SELF_REGISTERED else status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Submit event for approval'),
)
class EventSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = get_object_or_404(Event.objects.select_related('organization', 'created_by'), id=event_id)
        event = submit_event_for_approval(event=event, submitted_by=request.user)
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Approve event'),
)
class EventApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = get_object_or_404(Event.objects.select_related('organization', 'created_by'), id=event_id)
        event = approve_event(event=event, approved_by=request.user)
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Reject event'),
)
class EventRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = get_object_or_404(Event.objects.select_related('organization', 'created_by'), id=event_id)
        serializer = EventRejectSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        event = reject_event(
            event=event,
            rejected_by=request.user,
            rejection_note=serializer.validated_data['rejection_note'],
        )
        return Response(EventLifecycleSerializer(event).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Invite participant'),
)
class EventParticipantInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = get_object_or_404(Event.objects.select_related('organization', 'created_by'), id=event_id)
        serializer = EventParticipantInvitationWriteSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        participant = create_event_participant_invitation(
            event=event,
            invited_by=request.user,
            email=serializer.validated_data['email'],
            event_role=serializer.validated_data['event_role'],
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(
            EventParticipantInvitationSerializer(
                participant,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    patch=extend_schema(tags=['Events'], summary='Change participant role'),
)
class EventParticipantRoleUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, event_id, participant_id):
        event = get_object_or_404(Event.objects.select_related('organization', 'created_by'), id=event_id)
        participant = get_object_or_404(
            EventParticipant.objects.select_related('event', 'event__organization', 'invited_by', 'user'),
            id=participant_id,
            event=event,
        )
        serializer = EventParticipantRoleUpdateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        if not can_change_participant_role(request.user, event):
            return Response(
                {'detail': 'You do not have permission to change participant roles for this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if participant.event_role == 'initiator' or serializer.validated_data['event_role'] == 'initiator':
            return Response({'detail': 'The initiator role cannot be changed.'}, status=status.HTTP_400_BAD_REQUEST)

        participant.event_role = serializer.validated_data['event_role']
        participant.save(update_fields=['event_role', 'updated_at'])
        return Response(
            EventParticipantInvitationSerializer(participant, context={'frontend_url': settings.FRONTEND_URL}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Invite co-organizer organization'),
)
class EventCoOrganizerInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = get_object_or_404(Event.objects.select_related('organization', 'created_by'), id=event_id)
        serializer = EventCoOrganizerInvitationWriteSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        co_organizer = create_event_co_organizer_invitation(
            event=event,
            invited_by=request.user,
            contact_email=serializer.validated_data['contact_email'],
            organization_id=serializer.validated_data.get('organization_id'),
            frontend_url=settings.FRONTEND_URL,
        )
        return Response(
            EventCoOrganizerInvitationSerializer(
                co_organizer,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='Preview participant invitation'),
)
class EventParticipantInvitationDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        invitation_token, invitation = preview_event_participant_invitation(token=token)
        return Response(
            EventParticipantInvitationSerializer(
                invitation,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Accept participant invitation'),
)
class EventParticipantInvitationAcceptView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation_token, invitation = preview_event_participant_invitation(token=token)
        if not request.user.is_authenticated:
            request.session['pending_event_invitation'] = {
                'token': token,
                'kind': 'participant',
            }
            return Response(
                {
                    'detail': 'Please create an account or log in to accept this invitation.',
                    'registration_url': f'{settings.FRONTEND_URL.rstrip("/")}/register?event_invitation_token={token}&type=participant',
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        invitation = accept_event_participant_invitation(
            invitation_token=invitation_token,
            invitation=invitation,
            user=request.user,
        )
        return Response(
            EventParticipantInvitationSerializer(
                invitation,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Decline participant invitation'),
)
class EventParticipantInvitationDeclineView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation_token, invitation = preview_event_participant_invitation(token=token)
        invitation = decline_event_participant_invitation(
            invitation_token=invitation_token,
            invitation=invitation,
        )
        return Response(
            EventParticipantInvitationSerializer(
                invitation,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(tags=['Events'], summary='Preview co-organizer invitation'),
)
class EventCoOrganizerInvitationDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        invitation_token, invitation = preview_event_co_organizer_invitation(token=token)
        return Response(
            EventCoOrganizerInvitationSerializer(
                invitation,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Accept co-organizer invitation'),
)
class EventCoOrganizerInvitationAcceptView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation_token, invitation = preview_event_co_organizer_invitation(token=token)
        if not request.user.is_authenticated:
            request.session['pending_event_invitation'] = {
                'token': token,
                'kind': 'co_organizer',
            }
            return Response(
                {
                    'detail': 'Please create an account or log in to accept this invitation.',
                    'registration_url': f'{settings.FRONTEND_URL.rstrip("/")}/register?event_invitation_token={token}&type=co_organizer',
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        invitation = accept_event_co_organizer_invitation(
            invitation_token=invitation_token,
            invitation=invitation,
            user=request.user,
            organization_id=request.data.get('organization_id'),
        )
        return Response(
            EventCoOrganizerInvitationSerializer(
                invitation,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Events'], summary='Decline co-organizer invitation'),
)
class EventCoOrganizerInvitationDeclineView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invitation_token, invitation = preview_event_co_organizer_invitation(token=token)
        invitation = decline_event_co_organizer_invitation(
            invitation_token=invitation_token,
            invitation=invitation,
        )
        return Response(
            EventCoOrganizerInvitationSerializer(
                invitation,
                context={'frontend_url': settings.FRONTEND_URL},
            ).data,
            status=status.HTTP_200_OK,
        )
