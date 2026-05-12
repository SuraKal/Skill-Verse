// Types.ts
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

export interface InvitationDetail {
  id?: string
  organization_id?: string
  organization_name: string
  invited_email: string
  role: string
  status: string
  date_sent: string
  expires_at: string
  is_expired?: boolean
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
  organization_id: string
  invited_email: string
  role: string
  status: string
  date_sent: string
  expires_at: string
  invited_by: User
}

export interface OrganizationDashboardData {
  organization: Organization
  members: MembershipRecord[]
  invitations: OrganizationInvitation[]
  permissions: {
    role: string
    can_manage_invitations: boolean
    can_manage_members: boolean
    can_manage_settings: boolean
  }
  stats: {
    member_count: number
    pending_invitation_count: number
    manager_count: number
  }
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
