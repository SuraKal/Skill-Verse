export function capitalizeEventWords(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatEventDateRange(startValue: string, endValue: string) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  const startDate = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const endDate = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (startDate === endDate) {
    return `${startDate} · ${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }

  return `${startDate} - ${endDate}`
}

export function isOnlineEventLocation(location: string) {
  return /online|virtual|zoom|meet/i.test(location)
}

