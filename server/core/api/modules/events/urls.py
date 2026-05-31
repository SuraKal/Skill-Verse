from django.urls import path

from .views import (
    EventCollectionView,
    EventApproveView,
    EventCoOrganizerInvitationAcceptView,
    EventCoOrganizerInvitationDeclineView,
    EventCoOrganizerInvitationDetailView,
    EventCoOrganizerInviteView,
    EventCoOrganizerDeleteView,
    EventCoOrganizerListView,
    EventDetailView,
    EventOrganizationListView,
    EventParticipantInvitationAcceptView,
    EventParticipantInvitationDeclineView,
    EventParticipantInvitationDetailView,
    EventParticipantInviteView,
    EventParticipantDeleteView,
    EventParticipantListView,
    EventParticipantRoleUpdateView,
    EventSelfRegisterView,
    EventRejectView,
    EventSubmitView,
)


urlpatterns = [
    path('events/', EventCollectionView.as_view(), name='event-collection'),
    path('events/org/<uuid:org_id>/', EventOrganizationListView.as_view(), name='event-org-list'),
    path('events/<uuid:event_id>/', EventDetailView.as_view(), name='event-detail'),
    path('events/<uuid:event_id>/participants/', EventParticipantListView.as_view(), name='event-participant-list'),
    path(
        'events/<uuid:event_id>/participants/<uuid:participant_id>/',
        EventParticipantDeleteView.as_view(),
        name='event-participant-delete',
    ),
    path('events/<uuid:event_id>/co-organizers/', EventCoOrganizerListView.as_view(), name='event-co-organizer-list'),
    path(
        'events/<uuid:event_id>/co-organizers/<uuid:co_organizer_id>/',
        EventCoOrganizerDeleteView.as_view(),
        name='event-co-organizer-delete',
    ),
    path('events/<uuid:event_id>/register/', EventSelfRegisterView.as_view(), name='event-self-register'),
    path('events/<uuid:event_id>/submit/', EventSubmitView.as_view(), name='event-submit'),
    path('events/<uuid:event_id>/approve/', EventApproveView.as_view(), name='event-approve'),
    path('events/<uuid:event_id>/reject/', EventRejectView.as_view(), name='event-reject'),
    path('events/<uuid:event_id>/invite/', EventParticipantInviteView.as_view(), name='event-participant-invite'),
    path(
        'events/<uuid:event_id>/participants/<uuid:participant_id>/role/',
        EventParticipantRoleUpdateView.as_view(),
        name='event-participant-role-update',
    ),
    path(
        'events/<uuid:event_id>/co-organizers/invite/',
        EventCoOrganizerInviteView.as_view(),
        name='event-co-organizer-invite',
    ),
    path(
        'invitations/participant/<str:token>/',
        EventParticipantInvitationDetailView.as_view(),
        name='event-participant-invitation-detail',
    ),
    path(
        'invitations/participant/<str:token>/accept/',
        EventParticipantInvitationAcceptView.as_view(),
        name='event-participant-invitation-accept',
    ),
    path(
        'invitations/participant/<str:token>/decline/',
        EventParticipantInvitationDeclineView.as_view(),
        name='event-participant-invitation-decline',
    ),
    path(
        'invitations/co-organizer/<str:token>/',
        EventCoOrganizerInvitationDetailView.as_view(),
        name='event-co-organizer-invitation-detail',
    ),
    path(
        'invitations/co-organizer/<str:token>/accept/',
        EventCoOrganizerInvitationAcceptView.as_view(),
        name='event-co-organizer-invitation-accept',
    ),
    path(
        'invitations/co-organizer/<str:token>/decline/',
        EventCoOrganizerInvitationDeclineView.as_view(),
        name='event-co-organizer-invitation-decline',
    ),
]
