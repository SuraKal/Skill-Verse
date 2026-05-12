from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AuthRoutesView,
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
router.register('organizations', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('bootstrap/public/', PublicBootstrapView.as_view(), name='bootstrap-public'),
    path('auth/', AuthRoutesView.as_view(), name='auth-routes'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/token/', SkillVerseTokenView.as_view(), name='auth-token'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('invitations/<str:token>/', InvitationDetailView.as_view(), name='invitation-detail'),
    path('invitations/<str:token>/accept/', InvitationAcceptView.as_view(), name='invitation-accept'),
    path('invitations/<str:token>/reject/', InvitationRejectView.as_view(), name='invitation-reject'),
    path('', include(router.urls)),
]
