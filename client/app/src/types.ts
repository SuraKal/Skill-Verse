// Types.ts
// This file helps the frontend maintain type safety when interacting with the backend API and managing application state.
export type ModuleStatus = 'live' | 'planned'

export interface PlatformModule {
  name: string
  status: ModuleStatus
  description: string
}

export interface PlatformBootstrap {
  platform_name: string
  platform_tagline: string
  modules: PlatformModule[]
}

export interface UserProfile {
  title: string
  bio: string
  location: string
  active_organization_id: string | null
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  profile: UserProfile
}

export interface Organization {
  id: string
  name: string
  is_verified: boolean
  email: string
  phone: string
  logo: string | null
  description: string
  member_count?: number
  membership_role: string | null
}

export interface CourseCategory {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export interface OrganizationOption {
  id: string
  name: string
}

export interface CourseSection {
  id: string
  name: string
}

export interface CourseSubsectionVideo {
  id: string
  title: string
  embed_code: string
  order: number
}

export interface CourseSubsectionNote {
  id: string
  title: string
  file: string
  file_name: string
  order: number
}

export interface CourseSubsection {
  id: string
  name: string
  order: number
  videos: CourseSubsectionVideo[]
  notes: CourseSubsectionNote[]
}

export interface CoursePhaseSection {
  id: string
  order: number
  section: CourseSection
  subsections: CourseSubsection[]
}

export interface CoursePhase {
  id: string
  name: string
  description: string
  order: number
  sections: CoursePhaseSection[]
}

export interface Course {
  id: string;
  title: string;
  created_by: User | null;
  description: string;
  thumbnail: string | null;
  is_visible: boolean;
  privacy: "public" | "private";
  price_type: "free" | "paid";
  categories: CourseCategory[];
  organizations: OrganizationOption[];
  phases: CoursePhase[];
  can_manage: boolean;
  is_created_by_me: boolean;
  is_instructor: boolean;
  is_enrolled: boolean;
  is_member_course: boolean;
  can_enroll: boolean;
  is_public: boolean;
  is_free: boolean;
  instructor_count: number;
  created_at: string;
  updated_at: string;
}

export interface InvitationDetail {
  id: string
  token: string
  invitation_type: 'organization' | 'course_instructor' | 'course_enrollment'
  title: string
  subtitle: string
  invited_email: string
  role: string
  status: string
  date_sent: string
  expires_at: string
  organization_id: string
  organization_name: string
  course_id: string
  course_title: string
  custom_message: string
}

export interface DashboardData {
  user: User
  organizations: Organization[]
  memberships: Array<{
    organization_id: string
    organization_name: string
    role: string
  }>
  pending_invitations: InvitationDetail[]
  active_organization: Organization | null
  stats: {
    organization_count: number
    managed_organization_count: number
    pending_invitation_count: number
  }
}

export interface MembershipRecord {
  id: number
  role: string
  created_at: string
  user: User
}

export interface OrganizationInvitation {
  id: string
  token: string
  organization_id: string
  invited_email: string
  role: string
  status: string
  date_sent: string
  expires_at: string
  invited_by: User
}

export interface CourseInstructorAssignment {
  id: string
  created_at: string
  user: User
}
export interface CourseEnrollmentAssignment {
  id: string
  created_at: string
  user: User
}

export interface CourseInstructorInvitation {
  id: string
  token: string
  organization_id: string
  organization_name: string
  course_id: string
  course_title: string
  invited_email: string
  custom_message: string
  status: string
  date_sent: string
  expires_at: string
  invited_by: User
}

// CourseEnrollmentInvitation
export interface CourseEnrollmentInvitation {
  id: string
  token: string
  organization_id: string
  organization_name: string
  course_id: string
  course_title: string
  invited_email: string
  custom_message: string
  status: string
  date_sent: string
  expires_at: string
  invited_by: User
}

export interface OrganizationDashboardData {
  organization: Organization
  members: MembershipRecord[]
  invitations: OrganizationInvitation[]
  courses: Course[]
  course_categories: CourseCategory[]
  manageable_organizations: OrganizationOption[]
  permissions: {
    role: string
    can_manage_invitations: boolean
    can_manage_courses: boolean
    can_manage_members: boolean
    can_manage_settings: boolean
  }
  stats: {
    member_count: number
    pending_invitation_count: number
    course_count: number
    manager_count: number
  }
}

export interface CourseManagementData {
  course: Course;
  instructors: CourseInstructorAssignment[];
  enrollments: CourseEnrollmentAssignment[];
  instructor_invitations: CourseInstructorInvitation[];
  enrollment_invitations: CourseEnrollmentInvitation[];
  manageable_organizations: OrganizationOption[];
  price_type: "free" | "paid";
  permissions: {
    role: string;
    can_invite_instructors: boolean;
    can_invite_enrollments: boolean;
    can_manage_course: boolean;
  };
  stats: {
    instructor_count: number;
    pending_instructor_invitation_count: number;
    pending_enrollment_invitation_count: number;
  };
}

export interface CourseWorkspaceData {
  courses: Course[]
  course_categories: CourseCategory[]
  manageable_organizations: OrganizationOption[]
  stats: {
    visible_course_count: number
    created_course_count: number
    teaching_course_count: number
    enrolled_course_count: number
    manageable_course_count: number
  }
  filters: {
    all: number
    created: number
    teaching: number
    enrolled: number
  }
}

export interface SkillSwapProfile {
  id: string
  user: User
  teach_skills: string
  learn_skills: string
  summary: string
  teach_skills_list: string[]
  learn_skills_list: string[]
  created_at: string
  updated_at: string
}

export interface SkillSwapMatch {
  id: string
  teaching_user: User
  learning_user: User
  matched_skill: string
  teaching_text: string
  learning_text: string
  match_score: number
  is_active: boolean
  chat_thread_id: string | null
  created_at: string
  updated_at: string
}

export interface SkillChatMessage {
  id: string
  thread: string
  sender: User
  body: string
  created_at: string
  updated_at: string
}

export interface SkillChatThread {
  id: string
  match: SkillSwapMatch
  last_message_at: string | null
  messages: SkillChatMessage[]
  created_at: string
  updated_at: string
}

export interface SkillSwapDashboardData {
  profile: SkillSwapProfile | null
  matches: SkillSwapMatch[]
  threads: SkillChatThread[]
  stats: {
    teach_count: number
    learn_count: number
    match_count: number
    thread_count: number
    profile_completed: boolean
  }
}

export interface SkillSwapProfileUpdatePayload {
  teach_skills: string
  learn_skills: string
  summary: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
  confirm_password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export interface SessionState {
  access: string | null
  refresh: string | null
}

export interface UserProfileUpdatePayload {
  first_name: string
  last_name: string
  profile: {
    title: string
    bio: string
    location: string
  }
}
