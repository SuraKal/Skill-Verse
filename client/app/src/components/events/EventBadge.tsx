import type { EventRole, EventStatus } from '../../types'
import { capitalizeEventWords } from './eventUtils'

function getStatusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_')
}

function getRoleClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_')
}

function getStatusLabel(value: string) {
  return capitalizeEventWords(value)
}

function getRoleLabel(value: string) {
  if (value === 'co_organizer') {
    return 'Co-organizer'
  }

  return capitalizeEventWords(value)
}

export function EventBadge({
  type,
  value,
}: {
  type: 'status' | 'role'
  value: EventStatus | EventRole | string
}) {
  const normalizedValue = value.toLowerCase().replace(/\s+/g, '_')
  const label = type === 'status' ? getStatusLabel(normalizedValue) : getRoleLabel(normalizedValue)
  const className =
    type === 'status'
      ? `sv-status sv-status--${getStatusClass(normalizedValue)}`
      : `sv-role-badge sv-role-badge--${getRoleClass(normalizedValue)}`

  return <span className={className}>{label}</span>
}
