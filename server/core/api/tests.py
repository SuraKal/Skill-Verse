from django.test import override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Invitation, InvitationStatus, Membership, Organization, OrganizationRole
from .services.invitation_service import create_invitation

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PlatformFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='founder',
            email='founder@example.com',
            password='StrongPassword123!',
            first_name='Found',
            last_name='Er',
        )
        token_response = self.client.post(
            reverse('auth-token'),
            {'email': self.user.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.access_token = token_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_register_and_profile_bootstrap(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], self.user.email)

    def test_organization_creation_creates_creator_membership(self):
        response = self.client.post(
            reverse('organization-list'),
            {'name': 'Orbit Labs', 'email': 'team@orbitlabs.io'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        organization = Organization.objects.get(name='Orbit Labs')
        membership = Membership.objects.get(user=self.user, organization=organization)
        self.assertEqual(membership.role, OrganizationRole.CREATOR)

    def test_organization_dashboard_contains_members_and_invitations(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        create_invitation(
            organization=organization,
            invited_by=self.user,
            invited_email='invitee@example.com',
            role=OrganizationRole.MANAGER,
            frontend_url='http://localhost:5173',
        )

        response = self.client.get(reverse('organization-dashboard', kwargs={'pk': organization.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['organization']['name'], 'Orbit Labs')
        self.assertEqual(response.data['stats']['member_count'], 1)
        self.assertEqual(response.data['stats']['pending_invitation_count'], 1)
        self.assertTrue(response.data['permissions']['can_manage_invitations'])

    def test_invitation_acceptance_creates_membership(self):
        organization = Organization.objects.create(owner=self.user, name='Signal House')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        invitation = create_invitation(
            organization=organization,
            invited_by=self.user,
            invited_email='member@example.com',
            role=OrganizationRole.MEMBER,
            frontend_url='http://localhost:5173',
        )

        invitee = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='StrongPassword123!',
        )
        token_response = self.client.post(
            reverse('auth-token'),
            {'email': invitee.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        response = self.client.post(reverse('invitation-accept', kwargs={'token': invitation.token}), format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, InvitationStatus.ACCEPTED)
        self.assertTrue(Membership.objects.filter(user=invitee, organization=organization).exists())
