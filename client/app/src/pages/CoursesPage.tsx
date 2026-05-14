import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  createCourse,
  deleteCourse,
  fetchCourseWorkspace,
  updateCourse,
} from '../lib/api'
import { Icon } from '../components/DashboardLayout'
import type { Course, CourseCategory, CourseWorkspaceData, OrganizationOption } from '../types'
import '../styles/Dashboard.css'

type CourseScope = 'all' | 'created' | 'teaching' | 'enrolled'

type CourseFormState = {
  title: string
  description: string
  categoryIds: string[]
  organizationIds: string[]
  thumbnail: File | null
  privacy?: 'public' | 'private'
}

const emptyCourseForm: CourseFormState = {
  title: '',
  description: '',
  categoryIds: [],
  organizationIds: [],
  thumbnail: null,
  privacy: 'public',
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function toCourseFormState(course: Course): CourseFormState {
  return {
    title: course.title,
    description: course.description,
    categoryIds: course.categories.map((category) => category.id),
    organizationIds: course.organizations.map((organization) => organization.id),
    thumbnail: null,
    privacy: course.privacy,
  }
}

function CourseScopeNav({
  activeScope,
  filters,
  onChange,
}: {
  activeScope: CourseScope
  filters: CourseWorkspaceData['filters']
  onChange: (scope: CourseScope) => void
}) {
  const items: Array<{ key: CourseScope; label: string; count: number }> = [
    { key: 'all', label: 'All courses', count: filters.all },
    { key: 'created', label: 'My created', count: filters.created },
    { key: 'teaching', label: 'Teaching', count: filters.teaching },
    { key: 'enrolled', label: 'Enrolled', count: filters.enrolled },
  ]

  return (
    <div className="sv-panel" style={{ marginBottom: 12 }}>
      <div className="sv-workspace-nav">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sv-workspace-nav__item${activeScope === item.key ? ' sv-workspace-nav__item--active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span>{item.label}</span>
            <span className="sv-workspace-nav__count">{item.count}</span>
          </button>
        ))}
      </div>
      <p className="sv-panel__sub" style={{ marginTop: 14 }}>
        This page is built to stay flexible as enrollment and learner progress data are added later.
      </p>
    </div>
  )
}

function CourseComposer({
  token,
  categories,
  organizations,
  editingCourse,
  onSaved,
  onCancel,
}: {
  token: string
  categories: CourseCategory[]
  organizations: OrganizationOption[]
  editingCourse: Course | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<CourseFormState>(emptyCourseForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingCourse) {
      setForm(emptyCourseForm)
      setError(null)
      return
    }

    setForm(toCourseFormState(editingCourse))
    setError(null)
  }, [editingCourse])

  const isValid = form.title.trim() && form.categoryIds.length > 0 && form.organizationIds.length > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryIds: form.categoryIds,
        organizationIds: form.organizationIds,
        thumbnail: form.thumbnail,
        privacy: form.privacy,
      }

      if (editingCourse) {
        await updateCourse(token, editingCourse.id, payload)
      } else {
        await createCourse(token, payload)
      }

      setForm(emptyCourseForm)
      onSaved()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save course.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sv-course-composer">
      <div className="sv-panel__head">
        <div>
          <div className="sv-panel__title">{editingCourse ? 'Edit course' : 'Create course'}</div>
          <div className="sv-panel__sub">
            Manage course creation from one place while linking it to one or more organizations you run.
          </div>
        </div>
        {editingCourse && (
          <button className="sv-panel__action" type="button" onClick={onCancel}>
            Cancel edit
          </button>
        )}
      </div>

      <div className="sv-form-grid">
        <label className="sv-field">
          <span className="sv-field__label">Title</span>
          <input
            className="sv-input"
            type="text"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Customer Success Foundations"
          />
        </label>

        <label className="sv-field">
          <span className="sv-field__label">Thumbnail</span>
          <input
            className="sv-input"
            type="file"
            accept="image/*"
            onChange={(event) => setForm({ ...form, thumbnail: event.target.files?.[0] ?? null })}
          />
        </label>
      </div>

      <label className="sv-field" style={{ marginTop: 12 }}>
        <span className="sv-field__label">Description</span>
        <textarea
          className="sv-textarea"
          rows={4}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Add a short summary that helps instructors and learners understand the course."
        />
      </label>

      <label className="sv-field" style={{ marginTop: 12 }}>
        <span className="sv-field__label">Privacy</span>
        <select
          className="sv-input"
          value={form.privacy}
          onChange={(event) => setForm({ ...form, privacy: event.target.value as 'public' | 'private' })}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </label>


      <div className="sv-grid-2" style={{ marginBottom: 0 }}>
        <div className="sv-selector-card">
          <div className="sv-selector-card__title">Categories</div>
          <div className="sv-selector-card__sub">Assign one or more seeded categories.</div>
          <div className="sv-check-grid">
            {categories.map((category) => (
              <label key={category.id} className="sv-check">
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(category.id)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      categoryIds: toggleSelection(current.categoryIds, category.id),
                    }))
                  }
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sv-selector-card">
          <div className="sv-selector-card__title">Organizations</div>
          <div className="sv-selector-card__sub">Choose the organizations that should own or surface this course.</div>
          <div className="sv-check-grid">
            {organizations.map((organization) => (
              <label key={organization.id} className="sv-check">
                <input
                  type="checkbox"
                  checked={form.organizationIds.includes(organization.id)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      organizationIds: toggleSelection(current.organizationIds, organization.id),
                    }))
                  }
                />
                <span>{organization.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="sv-form-actions">
        <button className="btn btn--blue btn--sm" type="button" onClick={handleSubmit} disabled={saving || !isValid}>
          {saving ? 'Saving...' : editingCourse ? 'Update course' : 'Create course'}
        </button>
        {form.thumbnail && <span className="sv-file-pill">{form.thumbnail.name}</span>}
      </div>

      {error && (
        <p className="sv-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function CourseCard({
  course,
  onOpen,
  onEdit,
  onDelete,
}: {
  course: Course
  onOpen: (course: Course) => void
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
}) {
  const relationship = course.is_created_by_me
    ? 'Created by you'
    : course.is_instructor
      ? 'You teach this'
      : course.is_enrolled
        ? 'You are enrolled'
        : course.is_member_course
          ? 'From your workspace'
          : 'Visible across the catalog'
  
  const privacyLabel = course.is_public ? 'Public' : 'Private'
  return (
    <article className="sv-course-card">
      <div className="sv-course-card__media">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="sv-course-card__image"
          />
        ) : (
          <div className="sv-course-card__placeholder" aria-hidden>
            <Icon.Chart />
          </div>
        )}
      </div>
      <div className="sv-course-card__body">
        <div className="sv-course-card__header">
          <div>
            <div className="sv-course-card__title">{course.title}</div>
            <div className="sv-course-card__meta">
              {relationship} · {course.instructor_count} instructor
              {course.instructor_count === 1 ? "" : "s"}
            </div>
            <div className="sv-course-card__meta">{privacyLabel}</div>
          </div>
          <div className="sv-course-card__actions">
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => onOpen(course)}
            >
              Details
            </button>
            {course.can_manage && (
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                onClick={() => onEdit(course)}
              >
                Edit
              </button>
            )}
            {course.can_manage && (
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                onClick={() => onDelete(course)}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <p className="sv-course-card__description">
          {course.description || "No description added yet."}
        </p>
        <div className="sv-tag-group">
          {course.categories.map((category) => (
            <span key={category.id} className="sv-tag">
              {category.name}
            </span>
          ))}
        </div>
        <div className="sv-course-card__orgs">
          {course.organizations.map((organization) => (
            <span key={organization.id} className="sv-mini-pill">
              {organization.name}
            </span>
          ))}
        </div>

        {!course.can_manage && !course.is_enrolled && !course.is_instructor && (
          <div className="sv-course-card__actions sv-course-card__middle">
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => onDelete(course)}
            >
              Enroll
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function CoursesPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<CourseWorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeScope, setActiveScope] = useState<CourseScope>('all')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseActionError, setCourseActionError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchCourseWorkspace(token)
      .then((nextData) => {
        setData(nextData)
        if (editingCourse) {
          const refreshed = nextData.courses.find((course) => course.id === editingCourse.id) ?? null
          setEditingCourse(refreshed)
        }
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const filteredCourses = useMemo(() => {
    if (!data) return []
    switch (activeScope) {
      case 'created':
        return data.courses.filter((course) => course.is_created_by_me)
      case 'teaching':
        return data.courses.filter((course) => course.is_instructor)
      case 'enrolled':
        return data.courses.filter((course) => course.is_enrolled)
      case 'all':
      default:
        return data.courses.filter((course) => course.is_public || course.is_member_course || course.is_instructor || course.is_created_by_me)
    }
  }, [activeScope, data])

  if (loading) {
    return (
      <div>
        <div className="sv-skeleton" style={{ height: 26, width: 260, marginBottom: 8 }} />
        <div className="sv-skeleton" style={{ height: 14, width: 220, marginBottom: 24 }} />
        <div className="sv-metrics">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="sv-metric">
              <div className="sv-skeleton" style={{ height: 56 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon" aria-hidden>!</div>
        <div className="sv-empty__title">Failed to load courses</div>
        <div className="sv-empty__sub">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const handleDeleteCourse = async (course: Course) => {
    const confirmed = window.confirm(`Remove "${course.title}" from your managed organizations?`)
    if (!confirmed) return

    try {
      setCourseActionError(null)
      await deleteCourse(token, course.id)
      if (editingCourse?.id === course.id) {
        setEditingCourse(null)
      }
      load()
    } catch (deleteError) {
      setCourseActionError(deleteError instanceof Error ? deleteError.message : 'Failed to remove course.')
    }
  }

  return (
    <>
      <div className="sv-page-header">
        <h1 className="sv-page-header__title">Courses</h1>
        <p className="sv-page-header__sub">
          Browse the full course catalog, manage the courses you own, and keep instructor access independent from organization membership.
        </p>
      </div>

      <div className="sv-metrics" style={{ marginBottom: 16 }}>
        <div className="sv-metric">
          <div className="sv-metric__header">
            <span className="sv-metric__label">Visible courses</span>
            <span className="sv-metric__icon" aria-hidden><Icon.Chart /></span>
          </div>
          <div className="sv-metric__value">{data.stats.visible_course_count}</div>
          <div className="sv-metric__note">Across all organizations</div>
        </div>
        <div className="sv-metric">
          <div className="sv-metric__header">
            <span className="sv-metric__label">My created</span>
            <span className="sv-metric__icon" aria-hidden><Icon.Building /></span>
          </div>
          <div className="sv-metric__value">{data.stats.created_course_count}</div>
          <div className="sv-metric__note">Courses you started</div>
        </div>
        <div className="sv-metric">
          <div className="sv-metric__header">
            <span className="sv-metric__label">Teaching</span>
            <span className="sv-metric__icon" aria-hidden><Icon.Users /></span>
          </div>
          <div className="sv-metric__value">{data.stats.teaching_course_count}</div>
          <div className="sv-metric__note">Instructor access</div>
        </div>
        <div className="sv-metric">
          <div className="sv-metric__header">
            <span className="sv-metric__label">Manageable</span>
            <span className="sv-metric__icon" aria-hidden><Icon.Settings /></span>
          </div>
          <div className="sv-metric__value">{data.stats.manageable_course_count}</div>
          <div className="sv-metric__note">Editable from here</div>
        </div>
      </div>

      <CourseScopeNav activeScope={activeScope} filters={data.filters} onChange={setActiveScope} />

      <div className="sv-grid-2">
        <div className="sv-panel">
          <CourseComposer
            token={token}
            categories={data.course_categories}
            organizations={data.manageable_organizations}
            editingCourse={editingCourse}
            onSaved={() => {
              setEditingCourse(null)
              load()
            }}
            onCancel={() => setEditingCourse(null)}
          />
        </div>

        <div className="sv-panel">
          <div className="sv-panel__head">
            <span className="sv-panel__title">Course catalog</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{filteredCourses.length} shown</span>
          </div>
          {courseActionError && (
            <p className="sv-inline-error" role="alert">
              {courseActionError}
            </p>
          )}
          {filteredCourses.length === 0 ? (
            <div className="sv-empty" style={{ padding: '32px 0' }}>
              <div className="sv-empty__icon" aria-hidden><Icon.Chart /></div>
              <div className="sv-empty__title">No courses in this filter yet</div>
              <div className="sv-empty__sub">
                {activeScope === 'enrolled'
                  ? 'Enrollment-based course visibility will populate here as learner enrollment is added.'
                  : 'Switch filters or create a new course to get started.'}
              </div>
            </div>
          ) : (
            <div className="sv-course-list">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onOpen={(nextCourse) => navigate(`/dashboard/courses/${nextCourse.id}`)}
                  onEdit={(nextCourse) => setEditingCourse(nextCourse)}
                  onDelete={handleDeleteCourse}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
