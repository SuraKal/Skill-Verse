import type { ReactNode } from 'react'
import { Icon } from '../DashboardLayout'

export function EventSkeletonGrid({
  columns = 3,
  cards = 6,
}: {
  columns?: 2 | 3
  cards?: number
}) {
  return (
    <div className={columns === 3 ? 'sv-grid-3' : 'sv-grid-2'}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="sv-course-card">
          <div className="sv-course-card__media">
            <div className="sv-skeleton" style={{ height: '100%', minHeight: 180 }} />
          </div>
          <div className="sv-course-card__body">
            <div className="sv-skeleton" style={{ height: 18, width: '65%', marginBottom: 8 }} />
            <div className="sv-skeleton" style={{ height: 12, width: '45%', marginBottom: 8 }} />
            <div className="sv-skeleton" style={{ height: 12, width: '85%', marginBottom: 12 }} />
            <div className="sv-skeleton" style={{ height: 12, width: '92%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EventTableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="sv-table-wrap">
      <table className="sv-table" aria-label="Loading event content">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index}>
                <div className="sv-skeleton" style={{ height: 12, width: '70%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <td key={columnIndex}>
                  <div className="sv-skeleton" style={{ height: 14, width: columnIndex === 0 ? '85%' : '65%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EventEmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: 'calendar' | 'users' | 'building' | 'mail'
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const iconNode =
    icon === 'calendar' ? <Icon.Calendar /> : icon === 'users' ? <Icon.Users /> : icon === 'building' ? <Icon.Building /> : <Icon.Mail />

  return (
    <div className="sv-empty">
      <div className="sv-empty__icon" aria-hidden>
        {iconNode}
      </div>
      <div className="sv-empty__title">{title}</div>
      {subtitle && <div className="sv-empty__sub">{subtitle}</div>}
      {action}
    </div>
  )
}

export function EventErrorState({
  title,
  error,
  onRetry,
}: {
  title: string
  error: string
  onRetry?: () => void
}) {
  return (
    <div className="sv-panel" style={{ borderColor: 'rgba(239,68,68,0.35)' }}>
      <div className="sv-empty" style={{ padding: '28px 0' }}>
        <div className="sv-empty__icon" aria-hidden>
          !
        </div>
        <div className="sv-empty__title">{title}</div>
        <div className="sv-empty__sub">{error}</div>
        {onRetry && (
          <button className="btn btn--ghost btn--sm" type="button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
