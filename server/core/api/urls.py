from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .modules.courses.views import CourseViewSet
from .modules.organizations.views import OrganizationViewSet
from .views import (
    AuthRoutesView,
    CourseInstructorInvitationAcceptView,
    CourseInstructorInvitationDetailView,
    CourseInstructorInvitationRejectView,
    CourseEnrollmentInvitationAcceptView,
    CourseEnrollmentInvitationDetailView,
    CourseEnrollmentInvitationRejectView,
    DashboardView,
    InvitationAcceptView,
    InvitationDetailView,
    InvitationRejectView,
    MeView,
    OrganizationViewSet,
    PublicBootstrapView,
    RegisterView,
    SkillVerseTokenView,
)

router = DefaultRouter()
router.register('courses', CourseViewSet, basename='course')
router.register('organizations', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('bootstrap/public/', PublicBootstrapView.as_view(), name='bootstrap-public'),
    path('auth/', AuthRoutesView.as_view(), name='auth-routes'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/token/', SkillVerseTokenView.as_view(), name='auth-token'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('invitations/<str:token>/',
         InvitationDetailView.as_view(), name='invitation-detail'),
    path('invitations/<str:token>/accept/',
         InvitationAcceptView.as_view(), name='invitation-accept'),
    path('invitations/<str:token>/reject/',
         InvitationRejectView.as_view(), name='invitation-reject'),
    path(
        'course-invitations/<str:token>/',
        CourseInstructorInvitationDetailView.as_view(),
        name='course-invitation-detail',
    ),
    path(
        'course-invitations/<str:token>/accept/',
        CourseInstructorInvitationAcceptView.as_view(),
        name='course-invitation-accept',
    ),
    path(
        'course-invitations/<str:token>/reject/',
        CourseInstructorInvitationRejectView.as_view(),
        name='course-invitation-reject',
    ),
    path(
        'course-enrollment-invitations/<str:token>/',
        CourseEnrollmentInvitationDetailView.as_view(),
        name='course-enrollment-invitation-detail',
    ),
    path(
        'course-enrollment-invitations/<str:token>/accept/',
        CourseEnrollmentInvitationAcceptView.as_view(),
        name='course-enrollment-invitation-accept',
    ),
    path(
        'course-enrollment-invitations/<str:token>/reject/',
        CourseEnrollmentInvitationRejectView.as_view(),
        name='course-enrollment-invitation-reject',
    ),
    path('', include('api.modules.skill_swap.urls')),
    path('', include(router.urls)),
]
