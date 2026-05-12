import type { PlatformBootstrap } from '../types'

export const platformNarrative: PlatformBootstrap & {
  metrics: Array<{ label: string; value: string }>
  capabilities: Array<{ index: string; title: string; description: string }>
  roadmap: Array<{ title: string; stage: string; description: string }>
} = {
  platform_name: 'Skill Verse',
  platform_tagline: 'Build teams, knowledge, and operations around the user.',
  modules: [
    {
      name: 'Organizations',
      status: 'live',
      description: 'Users own organizations, switch context instantly, and retain a consistent personal dashboard.',
    },
    {
      name: 'Permissions',
      status: 'live',
      description: 'Creator, manager, and member roles keep governance explicit and extendable.',
    },
    {
      name: 'Invitations',
      status: 'live',
      description: 'Resend-backed email onboarding keeps organization growth secure and traceable.',
    },
    {
      name: 'Learning and community',
      status: 'planned',
      description: 'Future modules plug into the same identity and organization core.',
    },
  ],
  metrics: [
    { label: 'User-centric system model', value: '01' },
    { label: 'Role layers built in', value: '03' },
    { label: 'Expansion tracks prepared', value: '04' },
  ],
  capabilities: [
    {
      index: '01',
      title: 'Authentication-first product flow',
      description: 'Every meaningful experience starts from authenticated user identity and routes cleanly into a personal dashboard.',
    },
    {
      index: '02',
      title: 'Modular landing and dashboard surfaces',
      description: 'Cards and sections are designed as reusable UI primitives so product narrative and workspace features can grow together.',
    },
    {
      index: '03',
      title: 'Organization-aware collaboration',
      description: 'Multi-membership support lets one user operate across many organizations without fragmenting context or authorization.',
    },
  ],
  roadmap: [
    {
      title: 'Learning',
      stage: 'Future module',
      description: 'Courses, cohorts, and progress systems can be layered onto the same user and organization graph.',
    },
    {
      title: 'Community',
      stage: 'Future module',
      description: 'Discussion, member presence, and knowledge exchange can inherit the same membership and permission model.',
    },
    {
      title: 'Events',
      stage: 'Future module',
      description: 'Registrations and organization-driven programs can plug into the existing invitation and role structure.',
    },
    {
      title: 'Messaging',
      stage: 'Future module',
      description: 'Direct and organization-scoped messaging can grow from the same authenticated identity foundation.',
    },
  ],
}
