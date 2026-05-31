import json

from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Course,
    CourseCategory,
    CourseEnrollmentAssignment,
    CourseEnrollmentInvitation,
    CourseInstructorAssignment,
    CourseInstructorInvitation,
    CoursePhase,
    CourseSubsection,
    SkillChatThread,
    SkillMatch,
    SkillSwapProfile,
    Invitation,
    InvitationStatus,
    Membership,
    Organization,
    OrganizationRole,
    CoOrganizerStatus,
    Event,
    EventCoOrganizer,
    EventInviteStatus,
    EventParticipant,
    EventRole,
    EventStatus,
    EventVisibility,
    InviteOrigin,
)
from .services.invitation_service import create_invitation
from .services.email_service import send_event_reminder_email
from .modules.events.services import (
    activate_due_events,
    approve_event,
    create_event_co_organizer_invitation,
    create_event_participant_invitation,
    complete_due_events,
    reject_event,
    run_event_lifecycle_jobs,
    submit_event_for_approval,
)
from .modules.events.permissions import (
    can_approve_or_reject_event,
    can_assign_or_remove_event_admin,
    can_cancel_or_archive_event,
    can_change_participant_role,
    can_create_event,
    can_edit_event_details,
    can_invite_co_organizer,
    can_invite_participant,
    can_view_event_co_organizers,
    can_view_event_participants,
    can_view_org_private_event,
    can_view_private_event,
    can_view_public_event,
    can_self_register_public_event,
)

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

    def test_dashboard_includes_event_invitations(self):
        host_organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        invited_organization = Organization.objects.create(owner=self.user, name='Partner Circle')
        Membership.objects.create(user=self.user, organization=host_organization, role=OrganizationRole.CREATOR)
        Membership.objects.create(user=self.user, organization=invited_organization, role=OrganizationRole.CREATOR)
        event = Event.objects.create(
            organization=host_organization,
            title='SkillVerse Summit',
            description='Annual event for builders.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        create_event_participant_invitation(
            event=event,
            invited_by=self.user,
            email=self.user.email,
            event_role=EventRole.ATTENDEE,
            frontend_url='http://localhost:5173',
        )
        create_event_co_organizer_invitation(
            event=event,
            invited_by=self.user,
            contact_email=self.user.email,
            organization_id=str(invited_organization.id),
            frontend_url='http://localhost:5173',
        )

        response = self.client.get(reverse('dashboard'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['event_invitations'][0]['event_name'], 'SkillVerse Summit')
        self.assertEqual(len(response.data['event_invitations']), 2)
        self.assertEqual(response.data['stats']['pending_invitation_count'], 2)

    def test_organization_manager_can_create_course(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        category = CourseCategory.objects.get(slug='operations')

        response = self.client.post(
            reverse('organization-courses', kwargs={'pk': organization.id}),
            {
                'title': 'Org Operations 101',
                'description': 'Intro course for the team.',
                'is_visible': True,
                'category_ids': [str(category.id)],
                'organization_ids': [str(organization.id)],
                'phase_data': json.dumps([
                    {
                        'name': 'Course Preparation Week',
                        'description': 'Get everyone ready to begin.',
                        'order': 0,
                        'sections': [
                            {
                                'name': 'Orientation',
                                'order': 0,
                                'subsections': [
                                    {
                                        'name': 'Basic Computer Skills - Part I',
                                        'order': 0,
                                        'videos': [
                                            {
                                                'title': 'Intro video',
                                                'embed_code': '<iframe src="https://www.youtube.com/embed/test-video"></iframe>',
                                                'order': 0,
                                            }
                                        ],
                                        'notes': [
                                            {
                                                'title': 'Lesson note',
                                                'order': 0,
                                                'file_field': 'note_upload_test',
                                            }
                                        ],
                                    }
                                ],
                            },
                            {'name': 'Tool setup', 'order': 1},
                        ],
                    }
                ]),
                'note_upload_test': SimpleUploadedFile(
                    'lesson-note.txt',
                    b'course note content',
                    content_type='text/plain',
                ),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Course.objects.filter(title='Org Operations 101', organizations=organization).exists())
        course = Course.objects.get(title='Org Operations 101')
        self.assertTrue(course.is_visible)
        self.assertEqual(course.phases.count(), 1)
        self.assertEqual(course.phases.first().phase_sections.count(), 2)
        first_subsection = CourseSubsection.objects.filter(course_section__phase__course=course).first()
        self.assertIsNotNone(first_subsection)
        self.assertEqual(first_subsection.videos.count(), 1)
        self.assertEqual(first_subsection.notes.count(), 1)

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

    def test_instructor_course_management_hides_invitation_lists(self):
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
        self.assertFalse(response.data['permissions']['can_manage_course'])
        self.assertEqual(response.data['stats']['instructor_count'], 1)
        self.assertEqual(response.data['instructor_invitations'], [])
        self.assertEqual(response.data['enrollment_invitations'], [])
        self.assertEqual(response.data['enrollments'], [])

    def test_instructor_course_management_hides_rosters_in_organization_view(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Instructor Access Course', created_by=self.user)
        course.organizations.add(organization)

        instructor = User.objects.create_user(
            username='instructor-org-view',
            email='instructor-org-view@example.com',
            password='StrongPassword123!',
        )
        CourseInstructorAssignment.objects.create(course=course, user=instructor, invited_by=self.user)

        token_response = self.client.post(
            reverse('auth-token'),
            {'email': instructor.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        response = self.client.get(
            reverse('organization-course-management', kwargs={'pk': organization.id, 'course_id': course.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_manage_course'])
        self.assertEqual(response.data['stats']['instructor_count'], 1)
        self.assertEqual(response.data['instructors'], [])
        self.assertEqual(response.data['enrollments'], [])

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

    def test_manager_cannot_invite_existing_instructor_as_student(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Platform Foundations')
        course.organizations.add(organization)

        instructor = User.objects.create_user(
            username='teacher-role',
            email='teacher-role@example.com',
            password='StrongPassword123!',
        )
        CourseInstructorAssignment.objects.create(course=course, user=instructor, invited_by=self.user)

        response = self.client.post(
            reverse('course-enrollment-invitations', kwargs={'pk': course.id}),
            {
                'invited_email': instructor.email,
                'custom_message': 'Please join as a student.',
                'organization_id': str(organization.id),
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            CourseEnrollmentInvitation.objects.filter(course=course, invited_email=instructor.email).exists()
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

    def test_instructor_cannot_enroll_in_course(self):
        organization = Organization.objects.create(owner=self.user, name='Orbit Labs')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Instructor Access Course')
        course.organizations.add(organization)

        instructor = User.objects.create_user(
            username='instructor-enroll',
            email='instructor-enroll@example.com',
            password='StrongPassword123!',
        )
        CourseInstructorAssignment.objects.create(course=course, user=instructor, invited_by=self.user)

        token_response = self.client.post(
            reverse('auth-token'),
            {'email': instructor.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        response = self.client.post(reverse('course-enroll', kwargs={'pk': course.id}), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CourseEnrollmentAssignment.objects.filter(course=course, user=instructor).exists())

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

    def test_hidden_course_only_surfaces_for_privileged_users(self):
        owner_org = Organization.objects.create(owner=self.user, name='Hidden Ops')
        Membership.objects.create(user=self.user, organization=owner_org, role=OrganizationRole.CREATOR)
        hidden_course = Course.objects.create(
            title='Hidden Course',
            created_by=self.user,
            is_visible=False,
        )
        hidden_course.organizations.add(owner_org)

        outsider = User.objects.create_user(
            username='outsider',
            email='outsider@example.com',
            password='StrongPassword123!',
        )
        outsider_token_response = self.client.post(
            reverse('auth-token'),
            {'email': outsider.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {outsider_token_response.data['access']}")
        outsider_response = self.client.get(reverse('course-list'))

        self.assertEqual(outsider_response.status_code, status.HTTP_200_OK)
        self.assertFalse(any(course['title'] == 'Hidden Course' for course in outsider_response.data['courses']))

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        owner_response = self.client.get(reverse('course-list'))
        self.assertTrue(any(course['title'] == 'Hidden Course' for course in owner_response.data['courses']))

    def test_course_management_includes_phases_and_sections(self):
        organization = Organization.objects.create(owner=self.user, name='Outline Org')
        Membership.objects.create(user=self.user, organization=organization, role=OrganizationRole.CREATOR)
        course = Course.objects.create(title='Structured Course', created_by=self.user)
        course.organizations.add(organization)
        phase = CoursePhase.objects.create(
            course=course,
            name='Week 1',
            description='Foundations',
            order=0,
        )
        section = phase.sections.create(name='Basic Computer Skills')
        phase.phase_sections.filter(section=section).update(order=0)

        subsection = CourseSubsection.objects.create(
            course_section=phase.phase_sections.get(section=section),
            name='Basic Computer Skills - Part I',
            order=0,
        )
        subsection.videos.create(
            title='Walkthrough',
            embed_code='<iframe src="https://www.youtube.com/embed/test-video"></iframe>',
            order=0,
        )

        response = self.client.get(reverse('course-management', kwargs={'pk': course.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['course']['phases'][0]['name'], 'Week 1')
        self.assertEqual(
            response.data['course']['phases'][0]['sections'][0]['section']['name'],
            'Basic Computer Skills',
        )
        self.assertEqual(
            response.data['course']['phases'][0]['sections'][0]['subsections'][0]['name'],
            'Basic Computer Skills - Part I',
        )

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

    def test_skill_swap_profile_update_creates_text_match(self):
        learner = User.objects.create_user(
            username='learner',
            email='learner@example.com',
            password='StrongPassword123!',
        )
        SkillSwapProfile.objects.create(
            user=learner,
            teach_skills='Spanish',
            learn_skills='Guitar',
            summary='Looking for a guitar exchange.',
        )

        response = self.client.patch(
            reverse('skill-swap-profile'),
            {
                'teach_skills': 'Guitar, Piano',
                'learn_skills': 'Python',
                'summary': 'Happy to trade music lessons.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            SkillMatch.objects.filter(
                teaching_user=self.user,
                learning_user=learner,
                matched_skill='Guitar',
                is_active=True,
            ).exists()
        )
        match = SkillMatch.objects.get(
            teaching_user=self.user,
            learning_user=learner,
            matched_skill='Guitar',
        )
        self.assertTrue(SkillChatThread.objects.filter(match=match).exists())

        dashboard_response = self.client.get(reverse('skill-swap-dashboard'))
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(dashboard_response.data['stats']['teach_count'], 1)
        self.assertGreaterEqual(dashboard_response.data['stats']['learn_count'], 1)
        self.assertTrue(
            any(item['matched_skill'] == 'Guitar' for item in dashboard_response.data['matches'])
        )

        profile_response = self.client.get(reverse('skill-swap-profile'))
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertIn('teach_skills_list', profile_response.data)
        self.assertIn('learn_skills_list', profile_response.data)

    def test_skill_swap_profile_get_creates_profile_for_authenticated_user(self):
        response = self.client.get(reverse('skill-swap-profile'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(SkillSwapProfile.objects.filter(user=self.user).exists())
        self.assertEqual(response.data['user']['email'], self.user.email)

    def test_skill_swap_chat_threads_are_private_to_participants(self):
        learner = User.objects.create_user(
            username='skill-learner',
            email='skill-learner@example.com',
            password='StrongPassword123!',
        )
        SkillSwapProfile.objects.create(
            user=self.user,
            teach_skills='Guitar',
            learn_skills='Python',
        )
        SkillSwapProfile.objects.create(
            user=learner,
            teach_skills='Python',
            learn_skills='Guitar',
        )
        match = SkillMatch.objects.create(
            teaching_user=self.user,
            learning_user=learner,
            matched_skill='Guitar',
        )
        thread = SkillChatThread.objects.create(match=match)

        outsider = User.objects.create_user(
            username='skill-outsider',
            email='skill-outsider@example.com',
            password='StrongPassword123!',
        )
        outsider_token = self.client.post(
            reverse('auth-token'),
            {'email': outsider.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {outsider_token.data['access']}")

        response = self.client.get(
            reverse('skill-swap-thread-messages', kwargs={'thread_id': thread.id})
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_skill_swap_threads_and_matches_list_for_participants(self):
        learner = User.objects.create_user(
            username='skill-list-learner',
            email='skill-list-learner@example.com',
            password='StrongPassword123!',
        )
        SkillSwapProfile.objects.create(
            user=self.user,
            teach_skills='Guitar',
            learn_skills='Python',
            summary='Music and code.',
        )
        SkillSwapProfile.objects.create(
            user=learner,
            teach_skills='Python',
            learn_skills='Guitar',
            summary='Code and music.',
        )
        match = SkillMatch.objects.create(
            teaching_user=self.user,
            learning_user=learner,
            matched_skill='Guitar',
            teaching_text='Guitar',
            learning_text='Guitar',
            match_score=100,
            is_active=True,
        )
        SkillChatThread.objects.create(match=match)

        matches_response = self.client.get(reverse('skill-swap-matches'))
        self.assertEqual(matches_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(matches_response.data), 1)
        self.assertEqual(matches_response.data[0]['matched_skill'], 'Guitar')

    def test_event_permission_matrix_for_host_and_event_roles(self):
        host_org = Organization.objects.create(owner=self.user, name='Host Org')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        manager = User.objects.create_user(
            username='event-manager',
            email='event-manager@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=manager, organization=host_org, role=OrganizationRole.MANAGER)
        member = User.objects.create_user(
            username='event-member',
            email='event-member@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=member, organization=host_org, role=OrganizationRole.MEMBER)
        Event.objects.create(
            organization=host_org,
            title='Pending Approval Event',
            description='Manager edits need creator approval.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.PENDING_APPROVAL,
            created_by=self.user,
        )
        active_event = Event.objects.create(
            organization=host_org,
            title='Active Event',
            description='Active event for permission checks.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        archived_event = Event.objects.create(
            organization=host_org,
            title='Archived Event',
            description='Archived event for edit checks.',
            location='Nairobi',
            start_datetime=timezone.now() - timedelta(days=2),
            end_datetime=timezone.now() - timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ARCHIVED,
            created_by=self.user,
        )
        admin_user = User.objects.create_user(
            username='event-admin',
            email='event-admin@example.com',
            password='StrongPassword123!',
        )
        EventParticipant.objects.create(
            event=active_event,
            user=admin_user,
            email=admin_user.email,
            event_role=EventRole.ADMIN,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )
        EventParticipant.objects.create(
            event=archived_event,
            user=admin_user,
            email=admin_user.email,
            event_role=EventRole.ADMIN,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )
        co_org = Organization.objects.create(owner=User.objects.create_user(
            username='co-org-owner',
            email='co-org-owner@example.com',
            password='StrongPassword123!',
        ), name='Co Org')
        co_creator = co_org.owner
        Membership.objects.create(user=co_creator, organization=co_org, role=OrganizationRole.CREATOR)
        co_manager = User.objects.create_user(
            username='co-manager',
            email='co-manager@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=co_manager, organization=co_org, role=OrganizationRole.MANAGER)
        co_member = User.objects.create_user(
            username='co-member',
            email='co-member@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=co_member, organization=co_org, role=OrganizationRole.MEMBER)
        EventCoOrganizer.objects.create(
            event=active_event,
            organization=co_org,
            invited_by_user=self.user,
            invite_email='co-org@example.com',
            status=CoOrganizerStatus.ACCEPTED,
        )
        org_private_event = Event.objects.create(
            organization=host_org,
            title='Org Private Co Org Event',
            description='Org private co-organizer coverage.',
            location='Office',
            start_datetime=timezone.now() + timedelta(days=5),
            end_datetime=timezone.now() + timedelta(days=5, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.ORG_PRIVATE,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        EventCoOrganizer.objects.create(
            event=org_private_event,
            organization=co_org,
            invited_by_user=self.user,
            invite_email='org-private-co-org@example.com',
            status=CoOrganizerStatus.ACCEPTED,
        )

        self.assertTrue(can_create_event(self.user, host_org))
        self.assertTrue(can_create_event(manager, host_org))
        self.assertFalse(can_create_event(member, host_org))

        self.assertTrue(can_approve_or_reject_event(self.user, active_event))
        self.assertFalse(can_approve_or_reject_event(manager, active_event))

        self.assertTrue(can_edit_event_details(self.user, active_event))
        self.assertTrue(can_edit_event_details(manager, Event.objects.get(title='Pending Approval Event')))
        self.assertTrue(can_edit_event_details(admin_user, active_event))
        self.assertFalse(can_edit_event_details(member, active_event))
        self.assertFalse(can_edit_event_details(manager, archived_event))

        self.assertTrue(can_invite_co_organizer(self.user, active_event))
        self.assertTrue(can_invite_co_organizer(manager, active_event))
        self.assertFalse(can_invite_co_organizer(admin_user, active_event))
        self.assertFalse(can_invite_co_organizer(co_creator, active_event))

        self.assertTrue(can_invite_participant(self.user, active_event, EventRole.ATTENDEE))
        self.assertTrue(can_invite_participant(manager, active_event, EventRole.SPEAKER))
        self.assertTrue(can_invite_participant(admin_user, active_event, EventRole.VOLUNTEER))
        self.assertTrue(can_invite_participant(co_creator, active_event, EventRole.GUEST))
        self.assertTrue(can_invite_participant(co_manager, active_event, EventRole.ATTENDEE))
        self.assertFalse(can_invite_participant(co_member, active_event, EventRole.ATTENDEE))
        self.assertFalse(can_invite_participant(self.user, active_event, EventRole.ADMIN))
        self.assertFalse(can_invite_participant(co_manager, org_private_event, EventRole.ATTENDEE))

        self.assertTrue(can_assign_or_remove_event_admin(self.user, active_event))
        self.assertFalse(can_assign_or_remove_event_admin(manager, active_event))
        self.assertFalse(can_assign_or_remove_event_admin(admin_user, active_event))

        self.assertTrue(can_change_participant_role(self.user, active_event))
        self.assertTrue(can_change_participant_role(manager, active_event))
        self.assertTrue(can_change_participant_role(admin_user, active_event))
        self.assertFalse(can_change_participant_role(member, active_event))
        self.assertFalse(can_view_event_participants(co_manager, org_private_event))
        self.assertFalse(can_view_event_co_organizers(co_manager, org_private_event))

        self.assertTrue(can_cancel_or_archive_event(self.user, active_event))
        self.assertFalse(can_cancel_or_archive_event(manager, active_event))
        self.assertFalse(can_cancel_or_archive_event(admin_user, active_event))

    def test_event_visibility_rules_match_visibility_matrix(self):
        host_org = Organization.objects.create(owner=self.user, name='Visibility Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        invited_user = User.objects.create_user(
            username='invited-user',
            email='invited-user@example.com',
            password='StrongPassword123!',
        )
        outsider = User.objects.create_user(
            username='visibility-outsider',
            email='visibility-outsider@example.com',
            password='StrongPassword123!',
        )
        org_member = User.objects.create_user(
            username='org-member',
            email='org-member@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=org_member, organization=host_org, role=OrganizationRole.MEMBER)
        co_org = Organization.objects.create(owner=User.objects.create_user(
            username='visibility-co-owner',
            email='visibility-co-owner@example.com',
            password='StrongPassword123!',
        ), name='Visibility Co Org')
        co_creator = co_org.owner
        Membership.objects.create(user=co_creator, organization=co_org, role=OrganizationRole.CREATOR)

        private_event = Event.objects.create(
            organization=host_org,
            title='Private Event',
            description='Invite-only event.',
            location='Virtual',
            start_datetime=timezone.now() + timedelta(days=3),
            end_datetime=timezone.now() + timedelta(days=3, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PRIVATE,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        EventParticipant.objects.create(
            event=private_event,
            user=invited_user,
            email=invited_user.email,
            event_role=EventRole.ATTENDEE,
            invite_status=EventInviteStatus.PENDING,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )
        EventParticipant.objects.create(
            event=private_event,
            user=outsider,
            email=outsider.email,
            event_role=EventRole.ATTENDEE,
            invite_status=EventInviteStatus.DECLINED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )

        org_private_event = Event.objects.create(
            organization=host_org,
            title='Org Private Event',
            description='Members only event.',
            location='Office',
            start_datetime=timezone.now() + timedelta(days=4),
            end_datetime=timezone.now() + timedelta(days=4, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.ORG_PRIVATE,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        EventParticipant.objects.create(
            event=org_private_event,
            user=org_member,
            email=org_member.email,
            event_role=EventRole.ATTENDEE,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )
        EventParticipant.objects.create(
            event=org_private_event,
            user=self.user,
            email=self.user.email,
            event_role=EventRole.ADMIN,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )

        public_event = Event.objects.create(
            organization=host_org,
            title='Public Event',
            description='Open discovery event.',
            location='Town Hall',
            start_datetime=timezone.now() + timedelta(days=5),
            end_datetime=timezone.now() + timedelta(days=5, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )

        EventCoOrganizer.objects.create(
            event=org_private_event,
            organization=co_org,
            invited_by_user=self.user,
            invite_email='visibility-co@example.com',
            status=CoOrganizerStatus.ACCEPTED,
        )

        self.assertTrue(can_view_private_event(invited_user, private_event))
        self.assertFalse(can_view_private_event(outsider, private_event))
        self.assertTrue(can_view_private_event(None, private_event, email=invited_user.email))

        self.assertFalse(can_view_private_event(outsider, private_event))
        self.assertTrue(can_view_org_private_event(org_member, org_private_event))
        self.assertTrue(can_view_org_private_event(self.user, org_private_event))
        self.assertFalse(can_view_org_private_event(co_creator, org_private_event))
        self.assertFalse(can_view_org_private_event(outsider, org_private_event))

        self.assertTrue(can_view_public_event(public_event))
        self.assertTrue(can_self_register_public_event(None, public_event))

    def test_event_approval_flow_resubmission_and_status_transitions(self):
        mail.outbox.clear()
        host_org = Organization.objects.create(owner=self.user, name='Lifecycle Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        manager = User.objects.create_user(
            username='lifecycle-manager',
            email='lifecycle-manager@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=manager, organization=host_org, role=OrganizationRole.MANAGER)
        event = Event.objects.create(
            organization=host_org,
            title='Lifecycle Event',
            description='Approval flow coverage.',
            location='Online',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=3),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.DRAFT,
            created_by=manager,
        )

        submitted = submit_event_for_approval(event=event, submitted_by=manager)
        self.assertEqual(submitted.status, EventStatus.PENDING_APPROVAL)

        rejected = reject_event(event=submitted, rejected_by=self.user, rejection_note='Please update the agenda.')
        self.assertEqual(rejected.status, EventStatus.REJECTED)
        self.assertEqual(rejected.rejection_note, 'Please update the agenda.')
        self.assertIn('was not approved', mail.outbox[-1].subject)
        self.assertIn('Rejection note:', mail.outbox[-1].body)
        self.assertIn('Please update the agenda.', mail.outbox[-1].body)

        resubmitted = submit_event_for_approval(event=rejected, submitted_by=manager)
        self.assertEqual(resubmitted.status, EventStatus.PENDING_APPROVAL)
        self.assertIsNone(resubmitted.rejection_note)

        approved = approve_event(event=resubmitted, approved_by=self.user)
        self.assertEqual(approved.status, EventStatus.ACTIVE)
        self.assertIsNone(approved.rejection_note)
        self.assertIn('approved and is now active', mail.outbox[-1].subject)

    def test_event_lifecycle_jobs_advance_due_events(self):
        host_org = Organization.objects.create(owner=self.user, name='Lifecycle Jobs Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        active_event = Event.objects.create(
            organization=host_org,
            title='Due To Start',
            description='Should move to ongoing.',
            location='Nairobi',
            start_datetime=timezone.now() - timedelta(minutes=5),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        ongoing_event = Event.objects.create(
            organization=host_org,
            title='Due To Finish',
            description='Should move to completed.',
            location='Nairobi',
            start_datetime=timezone.now() - timedelta(hours=2),
            end_datetime=timezone.now() - timedelta(minutes=5),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ONGOING,
            created_by=self.user,
        )

        activated_events = activate_due_events(now=timezone.now())
        completed_events = complete_due_events(now=timezone.now())

        active_event.refresh_from_db()
        ongoing_event.refresh_from_db()

        self.assertEqual(active_event.status, EventStatus.ONGOING)
        self.assertEqual(ongoing_event.status, EventStatus.COMPLETED)
        self.assertEqual(len(activated_events), 1)
        self.assertEqual(len(completed_events), 1)

        summary = run_event_lifecycle_jobs(now=timezone.now())
        self.assertEqual(summary['activated'], 0)
        self.assertEqual(summary['completed'], 0)

        completed_patch_response = self.client.patch(
            reverse('event-detail', kwargs={'event_id': ongoing_event.id}),
            {'title': 'Should Not Change'},
            format='json',
        )
        self.assertEqual(completed_patch_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn(
            'cannot be edited after it has been archived or completed',
            str(completed_patch_response.data['detail']).lower(),
        )

    def test_event_participant_invitation_auto_accepts_after_registration(self):
        mail.outbox.clear()
        host_org = Organization.objects.create(owner=self.user, name='Invite Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        event = Event.objects.create(
            organization=host_org,
            title='Speaker Invite Event',
            description='Invitation coverage.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        invited_email = 'walkin-speaker@example.com'

        response = self.client.post(
            reverse('event-participant-invite', kwargs={'event_id': event.id}),
            {'email': invited_email, 'event_role': EventRole.SPEAKER},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EventParticipant.objects.filter(event=event, email=invited_email).count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Speaker Invite Event', mail.outbox[0].subject)
        self.assertIn('SPEAKER', mail.outbox[0].subject)
        self.assertIn("You'll need to create a free account to accept this invitation", mail.outbox[0].body)
        self.assertIn('Organization: Invite Host', mail.outbox[0].body)
        self.assertIn('Location: Nairobi', mail.outbox[0].body)

        duplicate_response = self.client.post(
            reverse('event-participant-invite', kwargs={'event_id': event.id}),
            {'email': invited_email, 'event_role': EventRole.SPEAKER},
            format='json',
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_409_CONFLICT)

        participant = EventParticipant.objects.get(event=event, email=invited_email)
        token = participant.tokens.first().token

        self.client.credentials()
        accept_response = self.client.post(
            reverse('event-participant-invitation-accept', kwargs={'token': token}),
            format='json',
        )
        self.assertEqual(accept_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('registration_url', accept_response.data)

        register_response = self.client.post(
            reverse('auth-register'),
            {
                'email': invited_email,
                'username': 'walkin-speaker',
                'first_name': 'Walk',
                'last_name': 'In',
                'password': 'StrongPassword123!',
                'confirm_password': 'StrongPassword123!',
            },
            format='json',
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        participant.refresh_from_db()
        token_record = participant.tokens.first()
        self.assertEqual(participant.invite_status, EventInviteStatus.ACCEPTED)
        self.assertIsNotNone(participant.user)
        self.assertEqual(participant.user.email, invited_email)
        self.assertIsNotNone(token_record.used_at)

    def test_expired_invitation_tokens_return_410_on_accept(self):
        host_org = Organization.objects.create(owner=self.user, name='Expiry Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        event = Event.objects.create(
            organization=host_org,
            title='Expired Token Event',
            description='Expiry coverage.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )

        participant_response = self.client.post(
            reverse('event-participant-invite', kwargs={'event_id': event.id}),
            {'email': 'expired-participant@example.com', 'event_role': EventRole.SPEAKER},
            format='json',
        )
        self.assertEqual(participant_response.status_code, status.HTTP_201_CREATED)
        participant = EventParticipant.objects.get(id=participant_response.data['id'])
        participant_token = participant.tokens.first()
        participant_token.expires_at = timezone.now() - timedelta(minutes=1)
        participant_token.save(update_fields=['expires_at', 'updated_at'])

        self.client.credentials()
        participant_accept_response = self.client.post(
            reverse('event-participant-invitation-accept', kwargs={'token': participant_token.token}),
            format='json',
        )
        self.assertEqual(participant_accept_response.status_code, status.HTTP_410_GONE)
        self.assertIn('request a new invitation', str(participant_accept_response.data['detail']).lower())

        co_org_owner = User.objects.create_user(
            username='expiry-co-owner',
            email='expiry-co-owner@example.com',
            password='StrongPassword123!',
        )
        co_org = Organization.objects.create(owner=co_org_owner, name='Expiry Co Org')
        Membership.objects.create(user=co_org_owner, organization=co_org, role=OrganizationRole.CREATOR)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        co_org_response = self.client.post(
            reverse('event-co-organizer-invite', kwargs={'event_id': event.id}),
            {'contact_email': co_org_owner.email, 'organization_id': str(co_org.id)},
            format='json',
        )
        self.assertEqual(co_org_response.status_code, status.HTTP_201_CREATED)
        co_org_invitation = EventCoOrganizer.objects.get(id=co_org_response.data['id'])
        co_org_token = co_org_invitation.tokens.first()
        co_org_token.expires_at = timezone.now() - timedelta(minutes=1)
        co_org_token.save(update_fields=['expires_at', 'updated_at'])

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        co_org_accept_response = self.client.post(
            reverse('event-co-organizer-invitation-accept', kwargs={'token': co_org_token.token}),
            format='json',
        )
        self.assertEqual(co_org_accept_response.status_code, status.HTTP_410_GONE)
        self.assertIn('request a new invitation', str(co_org_accept_response.data['detail']).lower())

    def test_org_private_event_blocks_non_member_participant_and_co_organizer_invites(self):
        host_org = Organization.objects.create(owner=self.user, name='Private Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        outsider = User.objects.create_user(
            username='outside-user',
            email='outside-user@example.com',
            password='StrongPassword123!',
        )
        event = Event.objects.create(
            organization=host_org,
            title='Members Only Event',
            description='Org private coverage.',
            location='Office',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.ORG_PRIVATE,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )

        participant_response = self.client.post(
            reverse('event-participant-invite', kwargs={'event_id': event.id}),
            {'email': outsider.email, 'event_role': EventRole.ATTENDEE},
            format='json',
        )
        self.assertEqual(participant_response.status_code, status.HTTP_400_BAD_REQUEST)

        co_organizer_response = self.client.post(
            reverse('event-co-organizer-invite', kwargs={'event_id': event.id}),
            {'contact_email': 'manager@otherorg.com', 'organization_id': str(host_org.id)},
            format='json',
        )
        self.assertEqual(co_organizer_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_event_co_organizer_invitation_acceptance_grants_invite_rights(self):
        mail.outbox.clear()
        host_org = Organization.objects.create(owner=self.user, name='Co Org Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        co_org_owner = User.objects.create_user(
            username='co-org-owner',
            email='co-manager@example.com',
            password='StrongPassword123!',
        )
        co_org = Organization.objects.create(owner=co_org_owner, name='Helper Org')
        Membership.objects.create(user=co_org_owner, organization=co_org, role=OrganizationRole.CREATOR)
        co_manager = User.objects.create_user(
            username='helper-manager',
            email='helper-manager@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=co_manager, organization=co_org, role=OrganizationRole.MANAGER)
        event = Event.objects.create(
            organization=host_org,
            title='Co Organizer Event',
            description='Co organizer coverage.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=3),
            end_datetime=timezone.now() + timedelta(days=3, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )

        response = self.client.post(
            reverse('event-co-organizer-invite', kwargs={'event_id': event.id}),
            {
                'contact_email': co_manager.email,
                'organization_id': str(co_org.id),
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EventCoOrganizer.objects.filter(event=event, invite_email=co_manager.email).count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('co-organize', mail.outbox[0].subject.lower())
        self.assertIn('Co Org Host', mail.outbox[0].body)
        self.assertIn('Registration link:', mail.outbox[0].body)

        invitation = EventCoOrganizer.objects.get(event=event, invite_email=co_manager.email)
        token = invitation.tokens.first().token

        token_response = self.client.post(
            reverse('auth-token'),
            {'email': co_manager.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

        accept_response = self.client.post(
            reverse('event-co-organizer-invitation-accept', kwargs={'token': token}),
            format='json',
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        invitation.refresh_from_db()
        self.assertEqual(invitation.status, CoOrganizerStatus.ACCEPTED)
        self.assertEqual(invitation.organization_id, co_org.id)
        self.assertTrue(can_invite_participant(co_manager, event, EventRole.ATTENDEE))

    def test_event_participant_role_change_endpoint_respects_initiator_lock(self):
        host_org = Organization.objects.create(owner=self.user, name='Role Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        participant_user = User.objects.create_user(
            username='role-participant',
            email='role-participant@example.com',
            password='StrongPassword123!',
        )
        event = Event.objects.create(
            organization=host_org,
            title='Role Change Event',
            description='Role change coverage.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        attendee = EventParticipant.objects.create(
            event=event,
            user=participant_user,
            email=participant_user.email,
            event_role=EventRole.ATTENDEE,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )
        initiator = EventParticipant.objects.create(
            event=event,
            user=self.user,
            email=self.user.email,
            event_role=EventRole.INITIATOR,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )

        response = self.client.patch(
            reverse('event-participant-role-update', kwargs={'event_id': event.id, 'participant_id': attendee.id}),
            {'event_role': EventRole.SPEAKER},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        attendee.refresh_from_db()
        self.assertEqual(attendee.event_role, EventRole.SPEAKER)

        initiator_response = self.client.patch(
            reverse('event-participant-role-update', kwargs={'event_id': event.id, 'participant_id': initiator.id}),
            {'event_role': EventRole.GUEST},
            format='json',
        )
        self.assertEqual(initiator_response.status_code, status.HTTP_400_BAD_REQUEST)
        initiator.refresh_from_db()
        self.assertEqual(initiator.event_role, EventRole.INITIATOR)

    def test_event_collection_create_list_detail_and_archive_endpoints(self):
        host_org = Organization.objects.create(owner=self.user, name='Collection Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        create_response = self.client.post(
            reverse('event-collection'),
            {
                'organization_id': str(host_org.id),
                'title': 'Public Launch',
                'description': 'Launch event coverage.',
                'cover_image': 'https://example.com/event.jpg',
                'location': 'Nairobi',
                'start_datetime': (timezone.now() + timedelta(days=1)).isoformat(),
                'end_datetime': (timezone.now() + timedelta(days=1, hours=2)).isoformat(),
                'timezone': 'Africa/Nairobi',
                'visibility': EventVisibility.PUBLIC,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        event_id = create_response.data['id']
        self.assertEqual(create_response.data['status'], EventStatus.ACTIVE)

        detail_response = self.client.get(reverse('event-detail', kwargs={'event_id': event_id}))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['title'], 'Public Launch')

        patch_response = self.client.patch(
            reverse('event-detail', kwargs={'event_id': event_id}),
            {'title': 'Public Launch Updated'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['title'], 'Public Launch Updated')

        self.client.credentials()
        list_response = self.client.get(reverse('event-collection'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)
        self.assertEqual(list_response.data['results'][0]['title'], 'Public Launch Updated')

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        archive_response = self.client.delete(reverse('event-detail', kwargs={'event_id': event_id}))
        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)
        self.assertEqual(archive_response.data['status'], EventStatus.ARCHIVED)

        archived_patch_response = self.client.patch(
            reverse('event-detail', kwargs={'event_id': event_id}),
            {'title': 'Should Not Update'},
            format='json',
        )
        self.assertEqual(archived_patch_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn(
            'cannot be edited after it has been archived or completed',
            str(archived_patch_response.data['detail']).lower(),
        )

    def test_event_endpoints_reject_blank_payloads(self):
        host_org = Organization.objects.create(owner=self.user, name='Validation Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        event = Event.objects.create(
            organization=host_org,
            title='Validation Event',
            description='Validation coverage.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        pending_event = Event.objects.create(
            organization=host_org,
            title='Pending Validation Event',
            description='Pending approval coverage.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=3),
            end_datetime=timezone.now() + timedelta(days=3, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.PENDING_APPROVAL,
            created_by=self.user,
        )

        create_response = self.client.post(
            reverse('event-collection'),
            {
                'organization_id': str(host_org.id),
                'title': ' ',
                'description': 'Launch event coverage.',
                'cover_image': '',
                'location': 'Nairobi',
                'start_datetime': (timezone.now() + timedelta(days=1)).isoformat(),
                'end_datetime': (timezone.now() + timedelta(days=1, hours=2)).isoformat(),
                'timezone': 'Africa/Nairobi',
                'visibility': EventVisibility.PUBLIC,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', create_response.data)

        patch_response = self.client.patch(
            reverse('event-detail', kwargs={'event_id': event.id}),
            {
                'title': 'Updated Validation Event',
                'location': ' ',
                'description': 'Updated validation coverage.',
                'start_datetime': (timezone.now() + timedelta(days=2)).isoformat(),
                'end_datetime': (timezone.now() + timedelta(days=2, hours=2)).isoformat(),
                'timezone': 'Africa/Nairobi',
                'visibility': EventVisibility.PUBLIC,
            },
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('location', patch_response.data)

        participant_response = self.client.post(
            reverse('event-participant-invite', kwargs={'event_id': event.id}),
            {'email': ' ', 'event_role': EventRole.ATTENDEE},
            format='json',
        )
        self.assertEqual(participant_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', participant_response.data)

        co_organizer_response = self.client.post(
            reverse('event-co-organizer-invite', kwargs={'event_id': event.id}),
            {'contact_email': ' '},
            format='json',
        )
        self.assertEqual(co_organizer_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contact_email', co_organizer_response.data)

        reject_response = self.client.post(
            reverse('event-reject', kwargs={'event_id': pending_event.id}),
            {'rejection_note': ' '},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rejection_note', reject_response.data)

    def test_manager_created_event_submits_for_approval_and_reedit_resets_status(self):
        mail.outbox.clear()
        host_org = Organization.objects.create(owner=self.user, name='Managed Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        manager = User.objects.create_user(
            username='event-manager-endpoint',
            email='event-manager-endpoint@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=manager, organization=host_org, role=OrganizationRole.MANAGER)
        manager_token = self.client.post(
            reverse('auth-token'),
            {'email': manager.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {manager_token.data['access']}")

        create_response = self.client.post(
            reverse('event-collection'),
            {
                'organization_id': str(host_org.id),
                'title': 'Needs Approval',
                'description': 'Manager-created event.',
                'location': 'Nairobi',
                'start_datetime': (timezone.now() + timedelta(days=2)).isoformat(),
                'end_datetime': (timezone.now() + timedelta(days=2, hours=2)).isoformat(),
                'timezone': 'Africa/Nairobi',
                'visibility': EventVisibility.PUBLIC,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['status'], EventStatus.PENDING_APPROVAL)
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertIn('submitted an event for your approval', mail.outbox[0].subject)
        self.assertIn('Approve:', mail.outbox[0].body)
        self.assertIn('Reject:', mail.outbox[0].body)
        self.assertIn('Organization: Managed Host', mail.outbox[0].body)

        event_id = create_response.data['id']
        patch_response = self.client.patch(
            reverse('event-detail', kwargs={'event_id': event_id}),
            {'title': 'Needs Approval Again'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['status'], EventStatus.PENDING_APPROVAL)
        self.assertEqual(patch_response.data['title'], 'Needs Approval Again')

        creator_token = self.client.post(
            reverse('auth-token'),
            {'email': self.user.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {creator_token.data['access']}")
        approval_response = self.client.post(reverse('event-approve', kwargs={'event_id': event_id}), format='json')
        self.assertEqual(approval_response.status_code, status.HTTP_200_OK)
        self.assertEqual(approval_response.data['status'], EventStatus.ACTIVE)
        self.assertIn('approved and is now active', mail.outbox[-1].subject)
        self.assertIn('Organization: Managed Host', mail.outbox[-1].body)

    def test_org_event_listing_respects_visibility(self):
        host_org = Organization.objects.create(owner=self.user, name='Org List Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        member = User.objects.create_user(
            username='org-list-member',
            email='org-list-member@example.com',
            password='StrongPassword123!',
        )
        Membership.objects.create(user=member, organization=host_org, role=OrganizationRole.MEMBER)
        outsider = User.objects.create_user(
            username='org-list-outsider',
            email='org-list-outsider@example.com',
            password='StrongPassword123!',
        )

        public_event = Event.objects.create(
            organization=host_org,
            title='Public Org Event',
            description='Public org visibility.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        org_private_event = Event.objects.create(
            organization=host_org,
            title='Org Private Org Event',
            description='Members only.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.ORG_PRIVATE,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        private_event = Event.objects.create(
            organization=host_org,
            title='Private Org Event',
            description='Invite only.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=3),
            end_datetime=timezone.now() + timedelta(days=3, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PRIVATE,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )
        EventParticipant.objects.create(
            event=private_event,
            user=member,
            email=member.email,
            event_role=EventRole.ATTENDEE,
            invite_status=EventInviteStatus.ACCEPTED,
            invite_origin=InviteOrigin.INVITED,
            invited_by=self.user,
        )

        member_token = self.client.post(
            reverse('auth-token'),
            {'email': member.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {member_token.data['access']}")
        member_response = self.client.get(reverse('event-org-list', kwargs={'org_id': host_org.id}))
        self.assertEqual(member_response.status_code, status.HTTP_200_OK)
        self.assertEqual(member_response.data['count'], 3)

        outsider_token = self.client.post(
            reverse('auth-token'),
            {'email': outsider.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {outsider_token.data['access']}")
        outsider_response = self.client.get(reverse('event-org-list', kwargs={'org_id': host_org.id}))
        self.assertEqual(outsider_response.status_code, status.HTTP_200_OK)
        self.assertEqual(outsider_response.data['count'], 1)
        self.assertEqual(outsider_response.data['results'][0]['id'], str(public_event.id))

    def test_event_management_lists_and_public_self_registration(self):
        mail.outbox.clear()
        host_org = Organization.objects.create(owner=self.user, name='Management Host')
        Membership.objects.create(user=self.user, organization=host_org, role=OrganizationRole.CREATOR)
        co_org_owner = User.objects.create_user(
            username='management-co-owner',
            email='management-co-owner@example.com',
            password='StrongPassword123!',
        )
        co_org = Organization.objects.create(owner=co_org_owner, name='Management Co Org')
        Membership.objects.create(user=co_org_owner, organization=co_org, role=OrganizationRole.CREATOR)
        event = Event.objects.create(
            organization=host_org,
            title='Management Event',
            description='Management endpoints.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=4),
            end_datetime=timezone.now() + timedelta(days=4, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.ACTIVE,
            created_by=self.user,
        )

        participant_response = self.client.post(
            reverse('event-participant-invite', kwargs={'event_id': event.id}),
            {'email': 'speaker@example.com', 'event_role': EventRole.SPEAKER},
            format='json',
        )
        self.assertEqual(participant_response.status_code, status.HTTP_201_CREATED)
        participant_id = participant_response.data['id']
        participant_list_response = self.client.get(reverse('event-participant-list', kwargs={'event_id': event.id}))
        self.assertEqual(participant_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(participant_list_response.data['count'], 1)

        participant_delete_response = self.client.delete(
            reverse('event-participant-delete', kwargs={'event_id': event.id, 'participant_id': participant_id})
        )
        self.assertEqual(participant_delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EventParticipant.objects.filter(id=participant_id).exists())

        co_org_response = self.client.post(
            reverse('event-co-organizer-invite', kwargs={'event_id': event.id}),
            {'contact_email': co_org_owner.email, 'organization_id': str(co_org.id)},
            format='json',
        )
        self.assertEqual(co_org_response.status_code, status.HTTP_201_CREATED)
        co_org_id = co_org_response.data['id']
        co_org_list_response = self.client.get(reverse('event-co-organizer-list', kwargs={'event_id': event.id}))
        self.assertEqual(co_org_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(co_org_list_response.data['count'], 1)

        co_org_delete_response = self.client.delete(
            reverse('event-co-organizer-delete', kwargs={'event_id': event.id, 'co_organizer_id': co_org_id})
        )
        self.assertEqual(co_org_delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EventCoOrganizer.objects.filter(id=co_org_id).exists())

        attendee = User.objects.create_user(
            username='self-registrant',
            email='self-registrant@example.com',
            password='StrongPassword123!',
        )
        attendee_token = self.client.post(
            reverse('auth-token'),
            {'email': attendee.email, 'password': 'StrongPassword123!'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {attendee_token.data['access']}")
        register_response = self.client.post(reverse('event-self-register', kwargs={'event_id': event.id}), format='json')
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            EventParticipant.objects.filter(
                event=event,
                user=attendee,
                invite_status=EventInviteStatus.ACCEPTED,
                invite_origin=InviteOrigin.SELF_REGISTERED,
                event_role=EventRole.ATTENDEE,
            ).exists()
        )

        draft_event = Event.objects.create(
            organization=host_org,
            title='Draft Registration Event',
            description='Not open yet.',
            location='Nairobi',
            start_datetime=timezone.now() + timedelta(days=6),
            end_datetime=timezone.now() + timedelta(days=6, hours=2),
            timezone='Africa/Nairobi',
            visibility=EventVisibility.PUBLIC,
            status=EventStatus.DRAFT,
            created_by=self.user,
        )
        draft_register_response = self.client.post(reverse('event-self-register', kwargs={'event_id': draft_event.id}), format='json')
        self.assertEqual(draft_register_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            'only available when the event is active or ongoing',
            str(draft_register_response.data).lower(),
        )

    def test_event_reminder_email_template_contains_summary(self):
        mail.outbox.clear()
        send_event_reminder_email(
            invited_email='reminder@example.com',
            organization_name='Reminder Org',
            event_name='Reminder Event',
            event_datetime='2026-06-01 09:00 EAT',
            location='Nairobi',
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Reminder: Reminder Event is tomorrow')
        self.assertIn('Organization: Reminder Org', mail.outbox[0].body)
        self.assertIn('Event: Reminder Event', mail.outbox[0].body)
        self.assertIn('Location: Nairobi', mail.outbox[0].body)
