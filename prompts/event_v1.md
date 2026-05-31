# Agent Implementation Prompt — Event Management Module

## Context & System Overview

You are implementing an **Event Management Module** as an additional feature to an existing **Organization Management System**. The existing system already has the following foundation you must build on top of — do not rebuild or conflict with it:

- **Organizations** exist as the top-level entity
- Every organization has three roles: **Creator**, **Manager**, and **Member**
- Creators have full organizational control and approval authority
- Managers can manage content but require Creator approval for certain actions
- Members participate only — no creation or invitation privileges
- A **Course** module already exists where Creators/Managers invite Instructors and Students via email

You are adding the **Events module** to this system. Everything below is the complete specification.

---

## Part 1 — Data Models

### 1.1 Event

```
Event {
  id                  UUID (primary key)
  organization_id     UUID (FK → Organization) — the Host Org
  title               String
  description         Text
  cover_image         String (URL, optional)
  location            String (physical address or virtual link)
  start_datetime      DateTime
  end_datetime        DateTime
  timezone            String
  visibility          Enum: PRIVATE | ORG_PRIVATE | PUBLIC
  status              Enum: DRAFT | PENDING_APPROVAL | ACTIVE | ONGOING | COMPLETED | ARCHIVED | REJECTED
  rejection_note      Text (nullable — populated when status = REJECTED)
  created_by          UUID (FK → User) — the Initiator
  created_at          DateTime
  updated_at          DateTime
}
```

### 1.2 EventParticipant
Tracks every person connected to an event regardless of role.

```
EventParticipant {
  id                  UUID (primary key)
  event_id            UUID (FK → Event)
  user_id             UUID (FK → User, nullable — null if invite not yet accepted)
  email               String — used to send invite before registration
  event_role          Enum: INITIATOR | ADMIN | ATTENDEE | SPEAKER | VOLUNTEER | GUEST
  invite_status       Enum: PENDING | ACCEPTED | DECLINED
  invite_origin       Enum: INVITED | SELF_REGISTERED
  invited_by          UUID (FK → User, nullable)
  invited_at          DateTime
  responded_at        DateTime (nullable)
}
```

### 1.3 EventCoOrganizer
Tracks organizations invited to co-organize an event.

```
EventCoOrganizer {
  id                  UUID (primary key)
  event_id            UUID (FK → Event)
  organization_id     UUID (FK → Organization)
  invited_by_user_id  UUID (FK → User)
  invite_email        String — contact email sent to the org
  status              Enum: PENDING | ACCEPTED | DECLINED
  invited_at          DateTime
  responded_at        DateTime (nullable)
}
```

### 1.4 Enums Summary

```
EventVisibility:    PRIVATE | ORG_PRIVATE | PUBLIC
EventStatus:        DRAFT | PENDING_APPROVAL | ACTIVE | ONGOING | COMPLETED | ARCHIVED | REJECTED
EventRole:          INITIATOR | ADMIN | ATTENDEE | SPEAKER | VOLUNTEER | GUEST
InviteStatus:       PENDING | ACCEPTED | DECLINED
InviteOrigin:       INVITED | SELF_REGISTERED
CoOrganizerStatus:  PENDING | ACCEPTED | DECLINED
```

---

## Part 2 — Role & Permission System

### 2.1 Who Can Do What

Implement a permission check layer that enforces the following matrix on every action:

| Action | Org Creator | Org Manager | Org Member | Event Initiator | Event Admin | Co-Org Manager/Creator | Co-Org Member |
|---|---|---|---|---|---|---|---|
| Create Event | ✅ | ✅ | ❌ | — | — | ❌ | ❌ |
| Approve / Reject Event | ✅ | ❌ | ❌ | — | — | ❌ | ❌ |
| Edit Event Details | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Invite Co-Organizer Org | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Invite Attendees/Speakers/Volunteers/Guests | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Assign / Remove Event Admin | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Change Participant Role | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Cancel / Archive Event | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Private Event | Invited only | Invited only | Invited only | ✅ | ✅ | ✅ | ❌ |
| View Org-Private Event | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Public Event | Everyone | Everyone | Everyone | ✅ | ✅ | ✅ | ✅ |

### 2.2 Initiator Rules
- Automatically assigned when a user creates an event — this cannot be manually set or transferred
- One Initiator per event, permanent
- Initiator has Admin-level permissions plus the ability to invite Co-Organizer Orgs and assign/remove Event Admins
- If the Initiator leaves the organization, their Initiator status remains on the event but org-level actions require a Creator to step in

### 2.3 Co-Organizer Org Rules
- Only the Host Org's Creators, Managers, and Event Initiator can send co-organizer invitations
- Once a co-organizer org accepts, their Creators and Managers get invite rights for that event only
- Co-organizer orgs can invite: ATTENDEE, SPEAKER, VOLUNTEER, GUEST — not other co-organizer orgs
- Co-organizer org members (non-Manager/Creator) have no event management rights

---

## Part 3 — Event Lifecycle & Approval Flow

### 3.1 Status Flow

```
[Creator creates event]   → Status: ACTIVE (no approval needed)
[Manager creates event]   → Status: PENDING_APPROVAL

PENDING_APPROVAL:
  → Creator approves      → Status: ACTIVE
  → Creator rejects       → Status: REJECTED (rejection_note required)

REJECTED:
  → Manager edits & resubmits → Status: PENDING_APPROVAL (note cleared)

ACTIVE:
  → Event start_datetime reached → Status: ONGOING (automatic, via scheduled job)

ONGOING:
  → Event end_datetime reached   → Status: COMPLETED (automatic, via scheduled job)

COMPLETED or ACTIVE:
  → Manual archive by Creator or Initiator → Status: ARCHIVED
```

### 3.2 Editing Rules
- A Manager **can edit** an event while it is in PENDING_APPROVAL status
- Any edit by a Manager on a PENDING_APPROVAL event resets it — Creator must re-approve
- Creators can edit at any status except ARCHIVED or COMPLETED
- Event Admins and Initiators can edit while status is ACTIVE or ONGOING

### 3.3 Scheduled Jobs Required
Implement two background jobs:
- **Activate Ongoing Job**: runs every minute (or via event trigger), sets ACTIVE → ONGOING when `now >= start_datetime`
- **Complete Event Job**: runs every minute, sets ONGOING → COMPLETED when `now >= end_datetime`

---

## Part 4 — Event Visibility Behavior

### 4.1 PRIVATE
- Not discoverable anywhere on the platform
- Not accessible by link unless the user has been explicitly invited
- Invitation can be sent to any email address (inside or outside the org)
- Uninvited users who somehow reach the event URL get a 404 or access-denied response — do not reveal the event exists

### 4.2 ORG_PRIVATE
- Visible only on the organization's internal dashboard to all org members (Creator, Manager, Member)
- Not discoverable publicly or by link
- Members see it listed and can RSVP — they are never auto-enrolled
- Invitations can only be sent to members of the host organization
- Co-organizer invitations are not available for ORG_PRIVATE events

### 4.3 PUBLIC
- Listed on the public events discovery page
- Discoverable by anyone including unauthenticated users
- Anyone can register as an Attendee — they must create a platform account to complete registration
- Specific roles (Speaker, Volunteer, Guest) are always invitation-only even on public events
- Invitations for special roles can be sent to any email
- Walk-in registrants (self-registered Attendees) are tracked with `invite_origin: SELF_REGISTERED`

---

## Part 5 — Invitation System

### 5.1 Inviting Individual Participants

**Endpoint:** `POST /events/:eventId/invite`

**Payload:**
```json
{
  "email": "person@example.com",
  "event_role": "SPEAKER"
}
```

**Behavior:**
- Permission check: caller must be Org Creator, Org Manager, Event Initiator, Event Admin, or Co-Org Manager/Creator
- For ORG_PRIVATE events: validate that the email belongs to an org member — reject otherwise
- For SPEAKER, VOLUNTEER, GUEST: always invitation-only regardless of event visibility
- Create an `EventParticipant` record with `invite_status: PENDING`, `user_id: null` if the user doesn't exist yet
- Send invitation email (see Section 7 for email specs)
- If the user already exists on the platform, link `user_id` immediately

**Role change after acceptance:**
- Implement `PATCH /events/:eventId/participants/:participantId/role`
- Callable by: Org Creator, Org Manager, Event Initiator, Event Admin
- Cannot change the INITIATOR role — it is permanent

### 5.2 Inviting Co-Organizer Organizations

**Endpoint:** `POST /events/:eventId/co-organizers/invite`

**Payload:**
```json
{
  "contact_email": "manager@otherorg.com",
  "organization_id": "uuid-optional-if-known"
}
```

**Behavior:**
- Only available for PRIVATE and PUBLIC events — not ORG_PRIVATE
- Permission check: caller must be Org Creator, Org Manager, or Event Initiator
- Create an `EventCoOrganizer` record with `status: PENDING`
- Send co-organizer invitation email (see Section 7)
- Recipient must have a platform account to accept — if they don't, email instructs them to register first, then accept from their dashboard

### 5.3 Accepting / Declining Invitations

**Endpoints:**
```
POST /invitations/participant/:token/accept
POST /invitations/participant/:token/decline
POST /invitations/co-organizer/:token/accept
POST /invitations/co-organizer/:token/decline
```

- Each invitation email contains a unique signed token
- Token is validated server-side (expiry: 7 days, regeneratable)
- If user is not registered: redirect to registration page, store token in session, auto-accept after registration completes
- If user is already logged in: accept/decline immediately
- On co-organizer accept: link the organization, grant invite rights to that org's Creators and Managers for this event specifically

---

## Part 6 — API Endpoints

Implement all endpoints with proper authentication middleware and permission checks.

### Events
```
POST   /events                          — Create event
GET    /events                          — List public events (discovery page)
GET    /events/org/:orgId               — List events for an org (auth required, respects visibility)
GET    /events/:eventId                 — Get single event (visibility-gated)
PATCH  /events/:eventId                 — Edit event details
DELETE /events/:eventId                 — Archive event (soft delete, sets ARCHIVED)
POST   /events/:eventId/submit          — Manager submits for approval
POST   /events/:eventId/approve         — Creator approves (sets ACTIVE)
POST   /events/:eventId/reject          — Creator rejects (requires rejection_note in body)
```

### Participants
```
POST   /events/:eventId/invite                              — Invite individual
GET    /events/:eventId/participants                        — List all participants
PATCH  /events/:eventId/participants/:participantId/role   — Change participant role
DELETE /events/:eventId/participants/:participantId        — Remove participant
```

### Co-Organizers
```
POST   /events/:eventId/co-organizers/invite               — Invite co-organizer org
GET    /events/:eventId/co-organizers                      — List co-organizer orgs
DELETE /events/:eventId/co-organizers/:coOrganizerId       — Remove co-organizer org
```

### Invitations (token-based, no auth required)
```
GET    /invitations/participant/:token           — Preview invitation details
POST   /invitations/participant/:token/accept   — Accept participant invite
POST   /invitations/participant/:token/decline  — Decline participant invite
GET    /invitations/co-organizer/:token         — Preview co-organizer invite
POST   /invitations/co-organizer/:token/accept  — Accept co-organizer invite
POST   /invitations/co-organizer/:token/decline — Decline co-organizer invite
```

### Public Registration (PUBLIC events only)
```
POST   /events/:eventId/register        — Self-register as Attendee (creates account if needed)
```

---

## Part 7 — Email Specifications

Implement the following email templates. All emails must include the organization's name, event name, date, and location.

### 7.1 Participant Invitation Email
- **Subject:** `You've been invited as a [ROLE] to [Event Name]`
- **Body includes:**
  - Inviting organization name
  - Event name, date, time, location
  - Their assigned role (Speaker / Attendee / Volunteer / Guest) clearly stated
  - Accept button → `/invitations/participant/:token/accept`
  - Decline button → `/invitations/participant/:token/decline`
  - If not registered: "You'll need to create a free account to accept this invitation" with a registration link that preserves the token

### 7.2 Co-Organizer Invitation Email
- **Subject:** `[Org Name] has invited your organization to co-organize [Event Name]`
- **Body includes:**
  - Host org name and event details
  - What co-organizing means (your managers/creators can invite attendees)
  - Accept button → `/invitations/co-organizer/:token/accept`
  - Decline button → `/invitations/co-organizer/:token/decline`
  - If not registered: registration prompt with token preservation

### 7.3 Approval Request Email (to Creators)
- **Subject:** `[Manager Name] submitted an event for your approval — [Event Name]`
- **Body includes:**
  - Event summary
  - Link to review the event in the dashboard
  - Approve and Reject buttons (deep link into dashboard, not token-based — requires auth)

### 7.4 Approval Result Email (to Manager)
- **Subject (approved):** `Your event [Event Name] has been approved and is now active`
- **Subject (rejected):** `Your event [Event Name] was not approved`
- **Body (rejected):** includes the rejection_note from the Creator

### 7.5 Event Reminder Emails (optional V1 addition)
- 24 hours before event: send reminder to all confirmed participants
- **Subject:** `Reminder: [Event Name] is tomorrow`

---

## Part 8 — Business Logic Rules (Enforce These Everywhere)

1. **An event cannot be edited after ARCHIVED or COMPLETED** — return 403 with message
2. **ORG_PRIVATE events cannot have co-organizer orgs** — return 400 if attempted
3. **Speaker, Volunteer, and Guest roles cannot self-register** — these are always invitation-only, return 403 if self-registration is attempted with these roles
4. **The INITIATOR role cannot be changed or reassigned** — return 400 if attempted
5. **A Manager editing a PENDING_APPROVAL event resets approval** — auto-set back to PENDING_APPROVAL and notify Creators again
6. **Duplicate invitations**: if an email is already in EventParticipant for this event with PENDING or ACCEPTED status, return 409 — do not send a duplicate email
7. **Token expiry**: invitation tokens expire in 7 days — expired tokens return 410 with a "request a new invitation" message
8. **Co-organizer orgs for ORG_PRIVATE**: blocked at API level with a clear error message
9. **Org-Private invitations to non-members**: validate email against org membership before creating the invite record — return 400 if not a member
10. **Public event self-registration**: only available when event status is ACTIVE or ONGOING — return 400 otherwise

---

## Part 9 — Implementation Notes for the Agent

- Build this as a **self-contained module** that integrates with the existing org/user/auth system via foreign keys and shared middleware — do not duplicate existing auth or org logic
- Use the **existing email service** already in the codebase — do not introduce a new one
- All permission checks should be implemented as **reusable middleware or service functions**, not inline in controllers
- The **scheduled status transitions** (ACTIVE → ONGOING → COMPLETED) should use whatever job/queue system is already in the codebase — if none exists, implement a simple cron-based approach and flag it for review
- **Invitation tokens** should be signed JWTs or secure random UUIDs stored in a separate `InvitationToken` table with `expires_at`, `used_at`, and `revoked` fields
- All list endpoints should support **pagination** (default page size: 20)
- All datetime fields should be stored in **UTC** — the `timezone` field on the event is for display purposes only
- Write **database migrations** for all new tables
- Write **unit tests** for: permission matrix, event lifecycle transitions, invitation token validation, and visibility access control
- Document all new endpoints in the existing API documentation format used by the project

---

---

## Part 10 — Frontend UI Specification (React + TypeScript + Vite)

### 10.0 Design System Reference

The existing app is called **SkillVerse**. Match these design tokens exactly across all new components:
Based on what we have been doing from Part 1 - 9 we will implement every feature UI for them without leaving out features or logics 


**Component patterns to replicate:**
- Stat cards: dark card, ALL-CAPS small label top-right icon, large number, small subtitle — same as "VISIBLE COURSES / 12 / Across all organizations"
- Tab selectors: pill-shaped, inactive = dark border, active = blue border + white text
- Two-column layout: left panel ~40% for forms/actions, right panel ~60% for lists/catalogs
- Tables: no outer border, subtle row dividers, avatar + name + sub-email pattern for users
- Badges: small pill, color-coded per status/role
- Breadcrumb: muted gray path e.g. "Events / Event management"
- Section labels: ALL-CAPS, small, `--text-secondary` color, letter-spaced
- Primary button: `--accent-blue` bg, white text, `--radius-md`
- Back navigation: small blue text link "← Back to events"

---

### 10.1 Sidebar Navigation Update

Add an **Events** entry to the a new left sidebar element under the `SKILL SWAP` section, directly below `Chat` Name it `Occasion` Group and Add event related under this:

```
Skill Swap
  Skills
  Matches
  Chat       (existing)
Occasion
  Events         (new) — icon: calendar
```

- Same styling as the Courses nav item
- Active state: white text + blue left indicator bar
- Route: `/events`

---

### 10.2 Page: Events Index `/events`

**Purpose:** Same role as the Courses index — overview stats, tab filters, event list, and create form.

**Layout:** Full-width content area matching Courses page structure.

**Breadcrumb:** `Events / Event workspace`

**Page title:** `Events`
**Subtitle:** `Browse all events, manage the ones you organize, and track your attendances across organizations.`

#### Stat Cards Row (4 cards, same pattern as Courses):
| Label | Icon | Value source | Subtitle |
|---|---|---|---|
| VISIBLE EVENTS | calendar icon | count of events user can see | Across all organizations |
| MY EVENTS | plus-circle icon | events user created (Initiator) | Events you started |
| CO-ORGANIZING | users icon | events where user's org is co-organizer | Active co-organizer role |
| ATTENDING | check-circle icon | events user is registered for | Confirmed attendance |

#### Tab Filters (pill tabs, same as Courses):
`All events [N]` · `My events [N]` · `Co-organizing [N]` · `Attending [N]`

Each tab filters the event list below.

#### Two-Column Lower Section:

**Left panel — Create Event form** (visible only to Org Creators and Managers):
- Section title: `Create event`
- Subtitle: `Events are tied to an organization you manage.`
- Fields:
  - TITLE — text input, placeholder: "Annual Developer Summit"
  - ORGANIZATION — dropdown of orgs user manages (same pattern as "SENDING ORGANIZATION" in Courses)
  - VISIBILITY — segmented selector with 3 options: `Private` · `Org Private` · `Public` — each with a small icon (lock, building, globe)
  - START DATE & TIME — date-time input
  - END DATE & TIME — date-time input
  - DESCRIPTION — textarea, placeholder: "Brief summary of what attendees can expect."
- Button: `Create event` (blue, full width)
- If user is only a Member (no orgs to manage): hide this panel entirely, show nothing in its place

**Right panel — Event catalog:**
- Section title: `Event catalog` · right-aligned count `N shown`
- Each event card (same card pattern as course catalog):
  - Cover image thumbnail (placeholder icon if none)
  - Event title (bold)
  - Org name · visibility badge (Private / Org Private / Public)
  - Status badge (Draft / Pending / Active / Ongoing / Completed / Archived / Rejected)
  - Date range: "Jun 12 – Jun 14, 2026"
  - User's role badge if they have one (Initiator / Admin / Attendee / Speaker / Volunteer / Guest)
  - `Details` button → navigates to `/events/:eventId`

#### Permission-gated rendering rules:
- Members with no managed orgs: see only the catalog, no create panel
- Managers: see create form but with a visible note — `"Your event will require Creator approval before going live."`
- Creators: see create form with no note

---

### 10.3 Page: Event Management `/events/:eventId`

**Purpose:** Single event management hub — mirrors the Course management page.

**Breadcrumb:** `Events / Event management`

**Back link:** `← Back to events`

**Page title:** Event title (large, bold)
**Subtitle:** `Manage event details, participants, and co-organizers.`

#### Stat Cards Row (2–4 cards depending on role):
| Label | Value | Shown to |
|---|---|---|
| PARTICIPANTS | total confirmed count | All event roles |
| PENDING INVITES | pending invite count | Initiator, Admin, Co-org managers |
| CO-ORGANIZERS | co-organizer org count | Initiator, Host org managers/creators |
| STATUS | current event status as badge | Initiator, Admins, Host org managers/creators |

#### Approval Banner (conditional):
- If status = `PENDING_APPROVAL` and viewer is a **Creator**: show a prominent yellow banner above the tabs:
  ```
  ⚠ This event is awaiting your approval.
  [Approve]  [Reject]
  ```
  Clicking Reject opens an inline textarea for rejection note before confirming.
- If status = `PENDING_APPROVAL` and viewer is the **Manager who created it**: show a blue info banner:
  ```
  ℹ This event is pending Creator approval. You can still edit it below.
  ```
- If status = `REJECTED`: show a red banner with the rejection note:
  ```
  ✕ This event was rejected: "[rejection_note]"  [Edit & Resubmit]
  ```

#### Tab Navigation (pill tabs):
`Details` · `Participants` · `Co-organizers` · `Invitations`

Show/hide tabs based on role:
- **Details**: visible to all
- **Participants**: visible to Initiator, Admin, Host org managers/creators, Co-org managers/creators
- **Co-organizers**: visible to Initiator, Host org managers/creators only. Hidden for ORG_PRIVATE events entirely.
- **Invitations**: visible to Initiator, Admin, Host org managers/creators, Co-org managers/creators

---

#### Tab: Details

Two-column layout:

**Left — Edit form** (editable by Initiator, Admin, Host org Creator/Manager while not ARCHIVED/COMPLETED):
- All event fields: Title, Description, Location, Start datetime, End datetime, Timezone, Visibility, Cover image upload
- `Save changes` button
- Fields are **read-only** (visually disabled) for viewers who cannot edit
- Visibility selector is **locked** after event goes ACTIVE — show a tooltip: "Visibility cannot be changed after the event is active."

**Right — Event summary card:**
- Cover image (large)
- Host organization name with avatar
- Status badge
- Formatted date range
- Location
- Visibility badge with icon

---

#### Tab: Participants

Two-column layout:

**Left — Invite participant panel** (shown to: Initiator, Admin, Host org managers/creators, Co-org managers/creators):
- Section title: `Invite participant`
- Fields:
  - EMAIL — text input
  - ROLE — dropdown: `Attendee` · `Speaker / Presenter` · `Volunteer` · `Guest`
    - Note under dropdown: `"Speaker, Volunteer, and Guest are always invitation-only."`
- Button: `Send invite` (blue)
- Disabled entirely for Org Members

**Right — Participants list:**
- Section title: `Participants` · right-aligned `N confirmed`
- Table columns: USER · ROLE · STATUS · ORIGIN · JOINED/INVITED
  - USER: avatar circle (initials) + display name + email below (or just email if not registered yet — show as italic "Invited, not yet registered")
  - ROLE: color-coded badge per role
  - STATUS: badge — Accepted (green) / Pending (yellow) / Declined (red)
  - ORIGIN: small text — "Invited" or "Self-registered"
  - JOINED: date or "—" if pending
- Action per row (visible to Initiator and Admin only):
  - `Change role` — opens small inline dropdown to reassign role (cannot change INITIATOR)
  - `Remove` — removes participant (confirm dialog)
- For PUBLIC events: show a separate sub-section header `Self-registered attendees` below invited participants

---

#### Tab: Co-organizers

**Only visible for PRIVATE and PUBLIC events. Completely hidden for ORG_PRIVATE.**

Two-column layout:

**Left — Invite co-organizer panel** (shown to: Initiator, Host org Creators, Host org Managers):
- Section title: `Invite co-organizer`
- Subtitle: `Invite another organization to help organize this event. Their managers and creators will be able to invite attendees.`
- Fields:
  - CONTACT EMAIL — text input, placeholder: "manager@otherorg.com"
  - ORGANIZATION NAME (optional) — text input, placeholder: "If known"
- Button: `Send co-organizer invite` (blue)

**Right — Co-organizer organizations list:**
- Section title: `Co-organizers` · right-aligned `N organizations`
- Each row:
  - Org avatar (initials circle) + org name + contact email
  - Status badge: Pending / Accepted / Declined
  - Date invited
  - `Remove` button (Initiator and Host org Creators only) — confirm dialog

---

#### Tab: Invitations

**Purpose:** Full invitation log — all outgoing invites in one place.

Single full-width table:
- Columns: RECIPIENT · ROLE · TYPE · STATUS · SENT · RESPONDED
  - RECIPIENT: email + name if registered
  - ROLE: badge (Attendee / Speaker / Co-organizer / etc.)
  - TYPE: "Participant" or "Co-organizer"
  - STATUS: Pending / Accepted / Declined
  - SENT: date
  - RESPONDED: date or "—"
- Actions per row (Initiator and Admin only):
  - `Resend` — only for PENDING invites older than 24h — re-triggers invitation email
  - `Revoke` — cancels the invite, removes record — confirm dialog
- Empty state: `"No invitations sent yet."` centered, muted text

---



### 10.4 Page: Public Events Discovery `/events/discover`

Make sure in every thing UI related that you do in the events page donot just everything in one file like events page, divide them into components so every thing is not in on efile

**Purpose:** Publicly accessible page. No auth required to browse. Auth required to register.

**Layout:** Full-width, no sidebar for unauthenticated users (or with sidebar if authenticated).



**Header section:**
- Large title: `Upcoming Events`
- Subtitle: `Discover public events from organizations on SkillVerse.`
- Search bar: full-width, placeholder: "Search events by name or organization..."

**Filter bar** (below search):
- `All` · `This week` · `This month` · `Online` · `In-person`

**Event grid:** 3-column responsive card grid
Each card:
- Cover image (full width of card, aspect ratio 16:9, placeholder if none)
- Org name + avatar (small, top-left overlay or below image)
- Event title (bold)
- Date range
- Location or "Online"
- `Public` badge
- `Register` button (blue) — if authenticated: registers directly. If not: redirects to login/register with return URL

**Empty state:** `"No public events found."` centered.

---

### 10.5 Page: Invitations `/invitations`

**This page already exists in the sidebar.** Extend it — do not replace it — by adding an Events section below the existing course invitations.

Add a new tab or section: `Event invitations`

Each invitation card:
- Event name (bold)
- Inviting organization name
- Your assigned role badge (Attendee / Speaker / Volunteer / Guest / Co-organizer)
- Event date range
- Status: Pending / Accepted / Declined
- For PENDING: `Accept` (blue) and `Decline` (outlined) buttons side by side
- For ACCEPTED/DECLINED: status badge only, no action buttons
- For Co-organizer invites: show "You've been invited to co-organize as [Org Name]" instead of a personal role

---

### 10.6 Routing Structure

Add these routes to the existing React Router config:

```
/events                        → EventsIndex
/events/discover               → EventsDiscover (public, no auth required)
/events/:eventId               → EventManagement
/invitations                   → InvitationsPage (existing, extended)
```

---

### 10.7 Permission-Gated UI Rules (Apply Everywhere)

These must be enforced at the component level — never just at the API level for UI:

| Condition | UI Behavior |
|---|---|
| User is Org Member only | Hide Create Event form entirely |
| User is Manager | Show create form + approval warning note |
| Event is ARCHIVED or COMPLETED | All edit fields disabled, save button hidden |
| Event is PENDING_APPROVAL, viewer is Creator | Show approval banner with Approve/Reject |
| Event is REJECTED, viewer is Manager | Show rejection banner with resubmit CTA |
| Visibility = ORG_PRIVATE | Hide Co-organizers tab entirely |
| Visibility = PUBLIC, event is not ACTIVE/ONGOING | Hide Register button, show "Registration not open yet" |
| User has no event role | Hide Participants and Co-organizers management actions |
| Role = INITIATOR in change-role dropdown | Disable that option, show tooltip "Initiator role is permanent" |
| Co-org manager/creator viewing Participants tab | Show invite panel, hide Remove and Change role actions |

---

### 10.8 Empty & Loading States

Implement for every list and table:

**Loading:** skeleton loaders matching the card/row shape — same dark theme, animated pulse
**Empty (events list):** calendar icon (large, muted) + `"No events yet."` + relevant CTA based on role
**Empty (participants):** users icon + `"No participants yet. Send your first invite."`
**Empty (co-organizers):** building icon + `"No co-organizers yet."`
**Empty (invitations):** mail icon + `"No invitations sent."`
**Error state:** red-tinted card with error message + retry button

---

### 10.9 Implementation Notes for Frontend

- All new components go in `src/components/events/` and `src/pages/events/`
- Reuse existing shared components (Button, Badge, Avatar, Input, Card, Modal, Tabs) — do not duplicate them
- All permission checks should use a shared `useEventPermissions(event, currentUser)` hook that returns a permissions object — never scatter inline role checks throughout JSX
- Use the existing API client/fetch wrapper already in the project — do not introduce a new HTTP library
- All date formatting should use the existing date utility already in the codebase
- Forms should use the existing form handling pattern in the project (controlled components or existing form library)
- All modals (Reject event, Remove participant, Revoke invite) should use the existing Modal component
- Status and role badges should be a single reusable `<EventBadge type="status|role" value="..." />` component
- The `useEventPermissions` hook must be the single source of truth for all UI gating — any conditional render must go through it

---

## Summary Checklist for the Agent

- [ ] Create Event, EventParticipant, EventCoOrganizer, InvitationToken database models and migrations
- [ ] Implement event CRUD with visibility-gated access
- [ ] Implement approval workflow (Manager → Pending → Creator approves/rejects)
- [ ] Implement event lifecycle auto-transitions via scheduled jobs
- [ ] Implement participant invitation system with role assignment at invite time
- [ ] Implement co-organizer org invitation system
- [ ] Implement token-based invitation accept/decline endpoints
- [ ] Implement public event self-registration
- [ ] Implement role-change endpoint for participants
- [ ] Implement full permission matrix as reusable middleware
- [ ] Implement all 5 email templates
- [ ] Write unit tests for all business logic rules
- [ ] Write API documentation for all new endpoints

### Backend
- [ ] Create Event, EventParticipant, EventCoOrganizer, InvitationToken database models and migrations
- [ ] Implement event CRUD with visibility-gated access
- [ ] Implement approval workflow (Manager → Pending → Creator approves/rejects)
- [ ] Implement event lifecycle auto-transitions via scheduled jobs
- [ ] Implement participant invitation system with role assignment at invite time
- [ ] Implement co-organizer org invitation system
- [ ] Implement token-based invitation accept/decline endpoints
- [ ] Implement public event self-registration
- [ ] Implement role-change endpoint for participants
- [ ] Implement full permission matrix as reusable middleware
- [ ] Implement all 5 email templates
- [ ] Write unit tests for all business logic rules
- [ ] Write API documentation for all new endpoints

### Frontend
- [ ] Add Events entry to sidebar nav under LEARNING section
- [ ] Build EventsIndex page (`/events`) — stat cards, tab filters, create form, event catalog
- [ ] Build EventManagement page (`/events/:eventId`) — stat cards, approval banners, 4 tabs
- [ ] Build Details tab — edit form + event summary card, with visibility lock after ACTIVE
- [ ] Build Participants tab — invite panel + participants table with role/status management
- [ ] Build Co-organizers tab — invite panel + co-organizer org list (hidden for ORG_PRIVATE)
- [ ] Build Invitations tab — full invitation log with resend/revoke actions
- [ ] Build EventsDiscover page (`/events/discover`) — public grid, search, filters, register
- [ ] Extend existing Invitations page with Event invitations section
- [ ] Build `useEventPermissions(event, currentUser)` hook as single source of truth for all UI gating
- [ ] Build reusable `<EventBadge type="status|role" value="..." />` component
- [ ] Implement all permission-gated UI rules from section 10.7 using the hook
- [ ] Implement skeleton loading states for all lists and tables
- [ ] Implement empty states for all lists and tables
- [ ] Add routes to existing React Router config