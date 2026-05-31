from django.urls import path

from .views import (
    SkillSwapDashboardView,
    SkillSwapMatchesView,
    SkillSwapProfileView,
    SkillSwapThreadMessagesView,
    SkillSwapThreadsView,
)

urlpatterns = [
    path('skill-swap/', SkillSwapDashboardView.as_view(), name='skill-swap-dashboard'),
    path('skill-swap/profile/', SkillSwapProfileView.as_view(), name='skill-swap-profile'),
    path('skill-swap/matches/', SkillSwapMatchesView.as_view(), name='skill-swap-matches'),
    path('skill-swap/threads/', SkillSwapThreadsView.as_view(), name='skill-swap-threads'),
    path(
        'skill-swap/threads/<uuid:thread_id>/messages/',
        SkillSwapThreadMessagesView.as_view(),
        name='skill-swap-thread-messages',
    ),
]
