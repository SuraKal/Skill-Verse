import json

from django.test import override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
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

        threads_response = self.client.get(reverse('skill-swap-threads'))
        self.assertEqual(threads_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(threads_response.data), 1)
        self.assertEqual(threads_response.data[0]['match']['matched_skill'], 'Guitar')
