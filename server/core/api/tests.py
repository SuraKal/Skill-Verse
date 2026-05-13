from django.test import override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Course,
    CourseCategory,
    CourseInstructorAssignment,
    CourseInstructorInvitation,
    Invitation,
    InvitationStatus,
    Membership,
    Organization,
    OrganizationRole,
)
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
        category = CourseCategory.objects.get(slug='engineering')
        course = Course.objects.create(title='Platform Foundations', description='Core platform course')
        course.categories.add(category)
        course.organizations.add(organization)
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
        self.assertEqual(response.data['stats']['course_count'], 1)
        self.assertTrue(response.data['permissions']['can_manage_invitations'])
        self.assertTrue(response.data['permissions']['can_manage_courses'])
        self.assertEqual(response.data['courses'][0]['title'], 'Platform Foundations')

    def test_organization_manager_can_create_course(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        category = CourseCategory.objects.get(slug='operations')

        response = self.client.post(
            reverse('organization-courses', kwargs={'pk': organization.id}),
            {
                'title': 'Org Operations 101',
                'description': 'Intro course for the team.',
                'category_ids': [str(category.id)],
                'organization_ids': [str(organization.id)],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Course.objects.filter(title='Org Operations 101', organizations=organization).exists())

    def test_member_cannot_create_course(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        member = User.objects.create_user(
            username='member-user',
            email='member-user@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=member, organization=organization, role=OrganizationRole.MEMBER)
        category = CourseCategory.objects.get(slug='community')

        token_response = self.client.post(
            reverse('auth-token'),
            {'email': member.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        response = self.client.post(
            reverse('organization-courses', kwargs={'pk': organization.id}),
            {
                'title': 'Member Attempt',
                'description': 'Should fail.',
                'category_ids': [str(category.id)],
                'organization_ids': [str(organization.id)],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Course.objects.filter(title='Member Attempt').exists())

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

    def test_course_management_detail_contains_instructors_and_invitations(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Platform Foundations', description='Core platform course')
        course.organizations.add(organization)

        instructor = User.objects.create_user(
            username='instructor-user',
            email='instructor@example.com',
            password='StrongPassword123!',
            first_name='Inst',
            last_name='Ructor',
        )
        CourseInstructorAssignment.objects.create(course=course, user=instructor, invited_by=self.user)
        CourseInstructorInvitation.objects.create(
            organization=organization,
            course=course,
            invited_by=self.user,
            invited_email='pending-instructor@example.com',
            custom_message='Please join this course.',
        )

        response = self.client.get(
            reverse('organization-course-management', kwargs={'pk': organization.id, 'course_id': course.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['course']['title'], 'Platform Foundations')
        self.assertEqual(response.data['stats']['instructor_count'], 1)
        self.assertEqual(response.data['stats']['pending_instructor_invitation_count'], 1)
        self.assertTrue(response.data['permissions']['can_invite_instructors'])

    def test_manager_can_invite_course_instructor(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Platform Foundations')
        course.organizations.add(organization)

        response = self.client.post(
            reverse('organization-course-instructor-invitations', kwargs={'pk': organization.id, 'course_id': course.id}),
            {
                'invited_email': 'teacher@example.com',
                'custom_message': 'Would love to have you teach this course.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CourseInstructorInvitation.objects.filter(course=course, invited_email='teacher@example.com').exists()
        )

    def test_course_instructor_invitation_acceptance_creates_assignment(self):
        organization = Organization.objects.create(owner=self.user, name='Signal House')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Signals 101')
        course.organizations.add(organization)
        invitation = CourseInstructorInvitation.objects.create(
            organization=organization,
            course=course,
            invited_by=self.user,
            invited_email='teacher@example.com',
            custom_message='Please teach this cohort.',
        )

        invitee = User.objects.create_user(
            username='teacher',
            email='teacher@example.com',
            password='StrongPassword123!',
        )
        token_response = self.client.post(
            reverse('auth-token'),
            {'email': invitee.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        response = self.client.post(
            reverse('course-invitation-accept', kwargs={'token': invitation.token}),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, InvitationStatus.ACCEPTED)
        self.assertTrue(CourseInstructorAssignment.objects.filter(course=course, user=invitee).exists())

    def test_global_course_workspace_returns_all_and_personal_course_signals(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        outsider_org = Organization.objects.create(owner=self.user, name='Catalog Partners')

        managed_course = Course.objects.create(
            title='Managed Course',
            description='Created by current user.',
            created_by=self.user,
        )
        managed_course.organizations.add(organization)

        public_course = Course.objects.create(title='Public Course', description='Visible in catalog.')
        public_course.organizations.add(outsider_org)

        instructor_user = User.objects.create_user(
            username='teaching-user',
            email='teaching@example.com',
            password='StrongPassword123!',
        )
        teaching_course = Course.objects.create(title='Teaching Course')
        teaching_course.organizations.add(outsider_org)
        CourseInstructorAssignment.objects.create(course=teaching_course, user=self.user, invited_by=instructor_user)

        response = self.client.get(reverse('course-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['filters']['all'], 3)
        self.assertEqual(response.data['filters']['created'], 1)
        self.assertEqual(response.data['filters']['teaching'], 1)
        managed_payload = next(course for course in response.data['courses'] if course['title'] == 'Managed Course')
        public_payload = next(course for course in response.data['courses'] if course['title'] == 'Public Course')
        teaching_payload = next(course for course in response.data['courses'] if course['title'] == 'Teaching Course')
        self.assertTrue(managed_payload['can_manage'])
        self.assertTrue(managed_payload['is_created_by_me'])
        self.assertFalse(public_payload['can_manage'])
        self.assertTrue(teaching_payload['is_instructor'])

    def test_instructor_without_organization_membership_can_open_course_management(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Instructor Access Course', created_by=self.user)
        course.organizations.add(organization)

        instructor = User.objects.create_user(
            username='instructor-only',
            email='instructor-only@example.com',
            password='StrongPassword123!',
        )
        CourseInstructorAssignment.objects.create(course=course, user=instructor, invited_by=self.user)

        token_response = self.client.post(
            reverse('auth-token'),
            {'email': instructor.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        response = self.client.get(reverse('course-management', kwargs={'pk': course.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['course']['title'], 'Instructor Access Course')
        self.assertEqual(response.data['permissions']['role'], 'instructor')
        self.assertFalse(response.data['permissions']['can_manage_course'])
