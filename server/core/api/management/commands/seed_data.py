import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.utils import timezone
from faker import Faker

from api.models import (
    Course,
    CourseCategory,
    CourseEnrollmentAssignment,
    CourseEnrollmentInvitation,
    CourseInstructorAssignment,
    CourseInstructorInvitation,
    CoursePhase,
    CoursePhaseSection,
    CourseSection,
    CourseSubsection,
    CourseSubsectionNote,
    CourseSubsectionVideo,
    SkillChatMessage,
    SkillChatThread,
    SkillMatch,
    SkillSwapProfile,
    Invitation,
    Membership,
    Organization,
    UserProfile,
)
from api.modules.skill_swap.services import rebuild_skill_matches

fake = Faker()

User = get_user_model()


class Command(BaseCommand):
    help = "Seed full demo database"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Starting database seed..."))

        # ==========================================
        # USERS
        # ==========================================
        users = []

        for i in range(15):
            first_name = fake.first_name()
            last_name = fake.last_name()

            user, created = User.objects.get_or_create(
                email=f"user{i}@skillverse.com",
                defaults={
                    "username": f"user{i}",
                    "first_name": first_name,
                    "last_name": last_name,
                },
            )

            user.set_password("password123")
            user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "title": fake.job(),
                    "bio": fake.text(max_nb_chars=200),
                    "location": fake.city(),
                },
            )

            users.append(user)

        self.stdout.write(self.style.SUCCESS("Users seeded"))

        # ==========================================
        # SKILL SWAP PROFILES
        # ==========================================
        skill_swap_blueprints = [
            {
                "teach": "Guitar, Piano",
                "learn": "Spanish",
                "summary": "Music mentor who also wants to get better at conversation skills.",
            },
            {
                "teach": "Spanish, Public Speaking",
                "learn": "Guitar",
                "summary": "Language coach open to a music exchange.",
            },
            {
                "teach": "Python, Excel",
                "learn": "Piano",
                "summary": "Automation-minded teammate looking to pick up music basics.",
            },
            {
                "teach": "Photography",
                "learn": "Python",
                "summary": "Creative builder who wants to learn a practical skill.",
            },
            {
                "teach": "Video Editing",
                "learn": "Photography",
                "summary": "Media creator interested in visual storytelling.",
            },
        ]

        for user, blueprint in zip(users[: len(skill_swap_blueprints)], skill_swap_blueprints):
            SkillSwapProfile.objects.update_or_create(
                user=user,
                defaults={
                    "teach_skills": blueprint["teach"],
                    "learn_skills": blueprint["learn"],
                    "summary": blueprint["summary"],
                },
            )

        for user in users[len(skill_swap_blueprints):]:
            SkillSwapProfile.objects.get_or_create(user=user)

        rebuild_skill_matches()

        seeded_match = SkillMatch.objects.filter(
            teaching_user__email='user0@skillverse.com',
            learning_user__email='user1@skillverse.com',
            matched_skill='Guitar',
        ).select_related('teaching_user', 'learning_user').first()

        if seeded_match is not None:
            thread, _ = SkillChatThread.objects.get_or_create(match=seeded_match)
            if thread.messages.count() == 0:
                SkillChatMessage.objects.create(
                    thread=thread,
                    sender=seeded_match.learning_user,
                    body='Hey, I saw your guitar skill. I would love to swap some lessons.',
                )
                SkillChatMessage.objects.create(
                    thread=thread,
                    sender=seeded_match.teaching_user,
                    body='Absolutely. I can help with chords and rhythm if you can help me with Spanish.',
                )

        self.stdout.write(self.style.SUCCESS("Skill swap profiles, matches, and demo chat seeded"))

        # ==========================================
        # ORGANIZATIONS
        # ==========================================
        organizations = []

        for i in range(5):
            owner = random.choice(users)

            organization, _ = Organization.objects.get_or_create(
                name=f"{fake.company()} Academy",
                defaults={
                    "owner": owner,
                    "email": fake.company_email(),
                    "phone": fake.phone_number(),
                    "description": fake.text(max_nb_chars=300),
                    "is_verified": True,
                },
            )

            organizations.append(organization)

        self.stdout.write(self.style.SUCCESS("Organizations seeded"))

        # ==========================================
        # MEMBERSHIPS
        # ==========================================
        roles = ["creator", "manager", "member"]

        for organization in organizations:
            selected_users = random.sample(users, k=5)

            for index, user in enumerate(selected_users):
                role = "creator" if index == 0 else random.choice(roles)

                Membership.objects.get_or_create(
                    user=user,
                    organization=organization,
                    defaults={"role": role},
                )

        self.stdout.write(self.style.SUCCESS("Memberships seeded"))

        # ==========================================
        # CATEGORIES
        # ==========================================
        category_names = [
            "Web Development",
            "Backend",
            "Frontend",
            "AI",
            "Cyber Security",
            "DevOps",
            "UI UX",
            "Mobile Development",
        ]

        categories = []

        for category_name in category_names:
            category, _ = CourseCategory.objects.get_or_create(
                name=category_name,
                defaults={
                    "slug": category_name.lower().replace(" ", "-"),
                    "is_active": True,
                },
            )

            categories.append(category)

        self.stdout.write(self.style.SUCCESS("Categories seeded"))

        # ==========================================
        # COURSES
        # ==========================================
        courses = []

        for i in range(12):
            creator = random.choice(users)

            course, _ = Course.objects.get_or_create(
                title=fake.sentence(nb_words=4),
                defaults={
                    "description": fake.text(max_nb_chars=500),
                    "created_by": creator,
                    "privacy": random.choice(["public", "private"]),
                    "price_type": random.choice(["free", "paid"]),
                    "is_visible": True,
                },
            )

            course.categories.add(*random.sample(categories, k=3))
            course.organizations.add(random.choice(organizations))

            courses.append(course)

        self.stdout.write(self.style.SUCCESS("Courses seeded"))

        # ==========================================
        # PHASES + SECTIONS + SUBSECTIONS + MATERIALS
        # ==========================================
        for course in courses:
            for phase_order in range(1, 4):
                phase, _ = CoursePhase.objects.get_or_create(
                    course=course,
                    order=phase_order,
                    defaults={
                        "name": f"Phase {phase_order}",
                        "description": fake.text(max_nb_chars=200),
                    },
                )

                for section_order in range(1, 4):
                    section, _ = CourseSection.objects.get_or_create(
                        name=fake.sentence(nb_words=3)
                    )

                    phase_section, _ = CoursePhaseSection.objects.get_or_create(
                        phase=phase,
                        section=section,
                        defaults={
                            "order": section_order,
                        },
                    )

                    for subsection_order in range(1, 3):
                        subsection, _ = CourseSubsection.objects.get_or_create(
                            course_section=phase_section,
                            order=subsection_order,
                            defaults={
                                "name": f"{section.name} - Part {subsection_order}",
                            },
                        )

                        for video_order in range(1, 3):
                            CourseSubsectionVideo.objects.get_or_create(
                                subsection=subsection,
                                order=video_order,
                                defaults={
                                    "title": f"Class Video {video_order}",
                                    "embed_code": '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Demo video" allowfullscreen></iframe>',
                                },
                            )

                        if not CourseSubsectionNote.objects.filter(subsection=subsection, order=0).exists():
                            note = CourseSubsectionNote(
                                subsection=subsection,
                                order=0,
                                title=f"Class Note {subsection_order}",
                            )
                            note.file.save(
                                f"seed-note-{subsection.id}.txt",
                                ContentFile("Demo seeded note content."),
                                save=True,
                            )

        self.stdout.write(self.style.SUCCESS("Phases, sections, subsections, and materials seeded"))

        # ==========================================
        # INSTRUCTOR ASSIGNMENTS
        # ==========================================
        for course in courses:
            instructors = random.sample(users, k=2)

            for instructor in instructors:
                CourseInstructorAssignment.objects.get_or_create(
                    course=course,
                    user=instructor,
                    defaults={
                        "invited_by": random.choice(users),
                    },
                )

        self.stdout.write(self.style.SUCCESS("Instructor assignments seeded"))

        # ==========================================
        # ENROLLMENTS
        # ==========================================
        for course in courses:
            students = random.sample(users, k=5)

            for student in students:
                CourseEnrollmentAssignment.objects.get_or_create(
                    course=course,
                    user=student,
                    defaults={
                        "invited_by": random.choice(users),
                    },
                )

        self.stdout.write(self.style.SUCCESS("Enrollments seeded"))

        # ==========================================
        # ORGANIZATION INVITATIONS
        # ==========================================
        for organization in organizations:
            for i in range(3):
                Invitation.objects.get_or_create(
                    token=fake.uuid4(),
                    defaults={
                        "organization": organization,
                        "invited_by": organization.owner,
                        "invited_email": fake.email(),
                        "role": random.choice(
                            ["creator", "manager", "member"]
                        ),
                        "status": random.choice(
                            ["pending", "accepted", "rejected"]
                        ),
                        "expires_at": timezone.now() + timedelta(days=7),
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            "Organization invitations seeded"))

        # ==========================================
        # COURSE INSTRUCTOR INVITATIONS
        # ==========================================
        for course in courses:
            CourseInstructorInvitation.objects.get_or_create(
                token=fake.uuid4(),
                defaults={
                    "course": course,
                    "organization": random.choice(organizations),
                    "invited_by": random.choice(users),
                    "invited_email": fake.email(),
                    "custom_message": fake.text(max_nb_chars=120),
                    "status": "pending",
                    "expires_at": timezone.now() + timedelta(days=7),
                },
            )

        self.stdout.write(
            self.style.SUCCESS("Instructor invitations seeded")
        )

        # ==========================================
        # COURSE ENROLLMENT INVITATIONS
        # ==========================================
        for course in courses:
            CourseEnrollmentInvitation.objects.get_or_create(
                token=fake.uuid4(),
                defaults={
                    "course": course,
                    "organization": random.choice(organizations),
                    "invited_by": random.choice(users),
                    "invited_email": fake.email(),
                    "custom_message": fake.text(max_nb_chars=120),
                    "status": "pending",
                    "expires_at": timezone.now() + timedelta(days=7),
                },
            )

        self.stdout.write(
            self.style.SUCCESS("Enrollment invitations seeded")
        )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS("FULL DATABASE SEEDED SUCCESSFULLY")
        )
        self.stdout.write("")
        self.stdout.write("Login password for all users:")
        self.stdout.write("password123")
