import { useEffect, useState } from 'react'

import { Icon } from './DashboardLayout'
import type { CoursePhase } from '../types'

export type EditableCourseVideo = {
  id?: string
  title: string
  embed_code: string
  order: number
}

export type EditableCourseNote = {
  id?: string
  title: string
  order: number
  file: File | null
  file_name?: string
  file_url?: string
}

export type EditableCourseSubsection = {
  id?: string
  name: string
  order: number
  videos: EditableCourseVideo[]
  notes: EditableCourseNote[]
}

export type EditableCourseSection = {
  id?: string
  name: string
  order: number
  subsections: EditableCourseSubsection[]
}

export type EditableCoursePhase = {
  id?: string
  name: string
  description: string
  order: number
  sections: EditableCourseSection[]
}

type TreeKey = string
type MenuState =
  | {
      kind: 'phase' | 'section' | 'subsection' | 'video' | 'note'
      phaseIndex: number
      sectionIndex?: number
      subsectionIndex?: number
      itemIndex?: number
    }
  | null

type OutlineModalState =
  | {
      mode: 'create' | 'edit'
      kind: 'phase'
      phaseIndex?: number
      values: {
        name: string
        description: string
      }
    }
  | {
      mode: 'create' | 'edit'
      kind: 'section'
      phaseIndex: number
      sectionIndex?: number
      values: {
        name: string
      }
    }
  | {
      mode: 'create' | 'edit'
      kind: 'subsection'
      phaseIndex: number
      sectionIndex: number
      subsectionIndex?: number
      values: {
        name: string
      }
    }
  | {
      mode: 'create' | 'edit'
      kind: 'video'
      phaseIndex: number
      sectionIndex: number
      subsectionIndex: number
      itemIndex?: number
      values: {
        title: string
        embed_code: string
      }
    }
  | {
      mode: 'create' | 'edit'
      kind: 'note'
      phaseIndex: number
      sectionIndex: number
      subsectionIndex: number
      itemIndex?: number
      values: {
        title: string
        file: File | null
        file_name?: string
        file_url?: string
      }
    }
  | null

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

function resequencePhases(phases: EditableCoursePhase[]) {
  return phases.map((phase, phaseIndex) => ({
    ...phase,
    order: phaseIndex,
    sections: phase.sections.map((section, sectionIndex) => ({
      ...section,
      order: sectionIndex,
      subsections: section.subsections.map((subsection, subsectionIndex) => ({
        ...subsection,
        order: subsectionIndex,
        videos: subsection.videos.map((video, videoIndex) => ({
          ...video,
          order: videoIndex,
        })),
        notes: subsection.notes.map((note, noteIndex) => ({
          ...note,
          order: noteIndex,
        })),
      })),
    })),
  }))
}

export function createEmptyVideo(): EditableCourseVideo {
  return {
    title: '',
    embed_code: '',
    order: 0,
  }
}

export function createEmptyNote(): EditableCourseNote {
  return {
    title: '',
    order: 0,
    file: null,
  }
}

export function createEmptySubsection(): EditableCourseSubsection {
  return {
    name: '',
    order: 0,
    videos: [],
    notes: [],
  }
}

export function createEmptySection(): EditableCourseSection {
  return {
    name: '',
    order: 0,
    subsections: [],
  }
}

export function createEmptyPhase(): EditableCoursePhase {
  return {
    name: '',
    description: '',
    order: 0,
    sections: [],
  }
}

export function normalizeEditablePhases(phases: CoursePhase[]): EditableCoursePhase[] {
  return resequencePhases(
    phases.map((phase, phaseIndex) => ({
      id: phase.id,
      name: phase.name,
      description: phase.description,
      order: phase.order ?? phaseIndex,
      sections: phase.sections.map((phaseSection, sectionIndex) => ({
        id: phaseSection.section.id,
        name: phaseSection.section.name,
        order: phaseSection.order ?? sectionIndex,
        subsections: phaseSection.subsections.map((subsection, subsectionIndex) => ({
          id: subsection.id,
          name: subsection.name,
          order: subsection.order ?? subsectionIndex,
          videos: subsection.videos.map((video, videoIndex) => ({
            id: video.id,
            title: video.title,
            embed_code: video.embed_code,
            order: video.order ?? videoIndex,
          })),
          notes: subsection.notes.map((note, noteIndex) => ({
            id: note.id,
            title: note.title,
            order: note.order ?? noteIndex,
            file: null,
            file_name: note.file_name,
            file_url: note.file,
          })),
        })),
      })),
    })),
  )
}

function extractEmbedSrc(embedCode: string) {
  const trimmed = embedCode.trim()
  if (!trimmed) return null

  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i)
  const candidate = srcMatch?.[1] ?? trimmed

  try {
    const parsed = new URL(candidate)
    const host = parsed.hostname.toLowerCase()
    const isAllowed =
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('player.vimeo.com') ||
      host.includes('vimeo.com')
    return isAllowed ? parsed.toString() : null
  } catch {
    return null
  }
}

function makeKey(parts: Array<string | number>) {
  return parts.join('-')
}

function countLessons(section: EditableCourseSection) {
  return section.subsections.reduce((total, subsection) => total + subsection.videos.length + subsection.notes.length, 0)
}

function countCourseLessons(phases: EditableCoursePhase[]) {
  return phases.reduce(
    (total, phase) => total + phase.sections.reduce((sectionTotal, section) => sectionTotal + countLessons(section), 0),
    0,
  )
}

function getPhaseSummary(phase: EditableCoursePhase) {
  const subsectionCount = phase.sections.reduce((total, section) => total + section.subsections.length, 0)
  const lessonCount = phase.sections.reduce((total, section) => total + countLessons(section), 0)
  return `${phase.sections.length} sections • ${subsectionCount} subsections • ${lessonCount} items`
}

function getSectionSummary(section: EditableCourseSection) {
  return `${section.subsections.length} subsections • ${countLessons(section)} items`
}

function getSubsectionSummary(subsection: EditableCourseSubsection) {
  return `${subsection.videos.length} videos • ${subsection.notes.length} notes`
}

function OutlineDialog({
  state,
  disabled,
  onClose,
  onChange,
  onSave,
}: {
  state: OutlineModalState
  disabled?: boolean
  onClose: () => void
  onChange: (state: Exclude<OutlineModalState, null>) => void
  onSave: (state: Exclude<OutlineModalState, null>) => void
}) {
  useEffect(() => {
    if (!state) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disabled) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, onClose, state])

  if (!state) return null

  const titles: Record<Exclude<OutlineModalState, null>['kind'], string> = {
    phase: state.mode === 'create' ? 'Add phase' : 'Edit phase',
    section: state.mode === 'create' ? 'Add section' : 'Edit section',
    subsection: state.mode === 'create' ? 'Add subsection' : 'Edit subsection',
    video: state.mode === 'create' ? 'Add video' : 'Edit video',
    note: state.mode === 'create' ? 'Add note' : 'Edit note',
  }

  const descriptions: Record<Exclude<OutlineModalState, null>['kind'], string> = {
    phase: 'Group related modules into a clear milestone or learning stage.',
    section: 'Add a section to organize lesson clusters inside this phase.',
    subsection: 'Create a smaller lesson block learners can open and work through.',
    video: 'Attach an embeddable class video to this subsection.',
    note: 'Upload a supporting note, worksheet, or reference file.',
  }

  const isValid =
    state.kind === 'phase' || state.kind === 'section' || state.kind === 'subsection'
      ? Boolean(state.values.name.trim())
      : state.kind === 'video'
        ? Boolean(state.values.title.trim() || state.values.embed_code.trim())
        : Boolean(state.values.title.trim() || state.values.file || state.values.file_url)

  return (
    <div className="sv-outline-modal" role="presentation" onClick={() => !disabled && onClose()}>
      <div
        className="sv-outline-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-outline-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sv-panel__head">
          <div>
            <div id="sv-outline-modal-title" className="sv-panel__title">
              {titles[state.kind]}
            </div>
            <div className="sv-panel__sub">{descriptions[state.kind]}</div>
          </div>
        </div>

        <div className="sv-outline-modal__body">
          {(state.kind === 'phase' || state.kind === 'section' || state.kind === 'subsection') && (
            <label className="sv-field">
              <span className="sv-field__label">Name</span>
              <input
                className="sv-input"
                type="text"
                value={state.values.name}
                disabled={disabled}
                placeholder={
                  state.kind === 'phase'
                    ? 'Course preparation'
                    : state.kind === 'section'
                      ? 'Week 1 - Foundations'
                      : 'Part 1 - Orientation'
                }
                onChange={(event) => {
                  if (state.kind === 'phase') {
                    onChange({ ...state, values: { ...state.values, name: event.target.value } })
                    return
                  }

                  onChange({ ...state, values: { name: event.target.value } })
                }}
              />
            </label>
          )}

          {state.kind === 'phase' && (
            <label className="sv-field">
              <span className="sv-field__label">Description</span>
              <textarea
                className="sv-textarea"
                rows={4}
                value={state.values.description}
                disabled={disabled}
                placeholder="Explain what this phase covers and how it fits into the course."
                onChange={(event) =>
                  onChange({
                    ...state,
                    values: {
                      ...state.values,
                      description: event.target.value,
                    },
                  })
                }
              />
            </label>
          )}

          {state.kind === 'video' && (
            <>
              <label className="sv-field">
                <span className="sv-field__label">Video title</span>
                <input
                  className="sv-input"
                  type="text"
                  value={state.values.title}
                  disabled={disabled}
                  placeholder="Lesson walkthrough"
                  onChange={(event) =>
                    onChange({
                      ...state,
                      values: {
                        ...state.values,
                        title: event.target.value,
                      },
                    })
                  }
                />
              </label>

              <label className="sv-field">
                <span className="sv-field__label">Video embed</span>
                <textarea
                  className="sv-textarea"
                  rows={4}
                  value={state.values.embed_code}
                  disabled={disabled}
                  placeholder="Paste a YouTube or Vimeo iframe embed code."
                  onChange={(event) =>
                    onChange({
                      ...state,
                      values: {
                        ...state.values,
                        embed_code: event.target.value,
                      },
                    })
                  }
                />
              </label>
            </>
          )}

          {state.kind === 'note' && (
            <>
              <label className="sv-field">
                <span className="sv-field__label">Note title</span>
                <input
                  className="sv-input"
                  type="text"
                  value={state.values.title}
                  disabled={disabled}
                  placeholder="Slides or worksheet"
                  onChange={(event) =>
                    onChange({
                      ...state,
                      values: {
                        ...state.values,
                        title: event.target.value,
                      },
                    })
                  }
                />
              </label>

              <label className="sv-field">
                <span className="sv-field__label">Upload file</span>
                <input
                  className="sv-input"
                  type="file"
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      values: {
                        ...state.values,
                        file: event.target.files?.[0] ?? null,
                        file_name: event.target.files?.[0]?.name ?? state.values.file_name,
                      },
                    })
                  }
                />
              </label>

              {(state.values.file_name || state.values.file_url) && (
                <div className="sv-inline-note">{state.values.file_name ?? 'Existing file attached'}</div>
              )}
            </>
          )}
        </div>

        <div className="sv-form-actions">
          <button className="btn btn--blue btn--sm" type="button" disabled={disabled || !isValid} onClick={() => onSave(state)}>
            {state.mode === 'create' ? 'Save item' : 'Update item'}
          </button>
          <button className="btn btn--ghost btn--sm" type="button" disabled={disabled} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

type OutlineTreeProps = {
  phases: EditableCoursePhase[]
  emptyMessage?: string
  editable?: boolean
  disabled?: boolean
  onChange?: (phases: EditableCoursePhase[]) => void
}

function OutlineTree({ phases, emptyMessage, editable = false, disabled = false, onChange }: OutlineTreeProps) {
  const [expandedKeys, setExpandedKeys] = useState<Record<TreeKey, boolean>>({})
  const [menuState, setMenuState] = useState<MenuState>(null)
  const [draftState, setDraftState] = useState<OutlineModalState>(null)

  useEffect(() => {
    setExpandedKeys({})
    setMenuState(null)
    setDraftState(null)
  }, [phases])

  if (phases.length === 0) {
    return (
      <div className="sv-empty sv-empty--compact">
        <div className="sv-empty__title">{editable ? 'No course outline yet' : emptyMessage ?? 'No phases have been added yet.'}</div>
        <div className="sv-empty__sub">
          {editable
            ? 'Start with a phase, then add sections, subsections, and lesson materials as needed.'
            : emptyMessage ?? 'No phases have been added yet.'}
        </div>
        {editable && (
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            disabled={disabled}
            onClick={() =>
              setDraftState({
                mode: 'create',
                kind: 'phase',
                values: { name: '', description: '' },
              })
            }
          >
            Add phase
          </button>
        )}
      </div>
    )
  }

  const updatePhases = (updater: (current: EditableCoursePhase[]) => EditableCoursePhase[]) => {
    if (!onChange) return
    onChange(resequencePhases(updater(phases)))
  }

  const toggleExpanded = (key: TreeKey) => {
    setExpandedKeys((current) => ({ ...current, [key]: !current[key] }))
  }

  const openBranch = (...keys: TreeKey[]) => {
    setExpandedKeys((current) => {
      const next = { ...current }
      keys.forEach((key) => {
        next[key] = true
      })
      return next
    })
  }

  const startCreate = (state: Exclude<OutlineModalState, null>) => {
    setMenuState(null)
    setDraftState(state)
  }

  const startEdit = (state: Exclude<OutlineModalState, null>) => {
    setMenuState(null)
    setDraftState(state)
  }

  const applyModal = (state: Exclude<OutlineModalState, null>) => {
    if (!onChange) return

    updatePhases((current) => {
      if (state.kind === 'phase') {
        if (state.mode === 'create') {
          return [...current, { ...createEmptyPhase(), name: state.values.name, description: state.values.description }]
        }

        return current.map((phase, phaseIndex) =>
          phaseIndex === state.phaseIndex
            ? {
                ...phase,
                name: state.values.name,
                description: state.values.description,
              }
            : phase,
        )
      }

      if (state.kind === 'section') {
        return current.map((phase, phaseIndex) =>
          phaseIndex === state.phaseIndex
            ? {
                ...phase,
                sections:
                  state.mode === 'create'
                    ? [...phase.sections, { ...createEmptySection(), name: state.values.name }]
                    : phase.sections.map((section, sectionIndex) =>
                        sectionIndex === state.sectionIndex ? { ...section, name: state.values.name } : section,
                      ),
              }
            : phase,
        )
      }

      if (state.kind === 'subsection') {
        return current.map((phase, phaseIndex) =>
          phaseIndex === state.phaseIndex
            ? {
                ...phase,
                sections: phase.sections.map((section, sectionIndex) =>
                  sectionIndex === state.sectionIndex
                    ? {
                        ...section,
                        subsections:
                          state.mode === 'create'
                            ? [...section.subsections, { ...createEmptySubsection(), name: state.values.name }]
                            : section.subsections.map((subsection, subsectionIndex) =>
                                subsectionIndex === state.subsectionIndex ? { ...subsection, name: state.values.name } : subsection,
                              ),
                      }
                    : section,
                ),
              }
            : phase,
        )
      }

      if (state.kind === 'video') {
        return current.map((phase, phaseIndex) =>
          phaseIndex === state.phaseIndex
            ? {
                ...phase,
                sections: phase.sections.map((section, sectionIndex) =>
                  sectionIndex === state.sectionIndex
                    ? {
                        ...section,
                        subsections: section.subsections.map((subsection, subsectionIndex) =>
                          subsectionIndex === state.subsectionIndex
                            ? {
                                ...subsection,
                                videos:
                                  state.mode === 'create'
                                    ? [...subsection.videos, { ...createEmptyVideo(), ...state.values }]
                                    : subsection.videos.map((video, videoIndex) =>
                                        videoIndex === state.itemIndex ? { ...video, ...state.values } : video,
                                      ),
                              }
                            : subsection,
                        ),
                      }
                    : section,
                ),
              }
            : phase,
        )
      }

      return current.map((phase, phaseIndex) =>
        phaseIndex === state.phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, sectionIndex) =>
                sectionIndex === state.sectionIndex
                  ? {
                      ...section,
                      subsections: section.subsections.map((subsection, subsectionIndex) =>
                        subsectionIndex === state.subsectionIndex
                          ? {
                              ...subsection,
                              notes:
                                state.mode === 'create'
                                  ? [...subsection.notes, { ...createEmptyNote(), ...state.values }]
                                  : subsection.notes.map((note, noteIndex) =>
                                      noteIndex === state.itemIndex
                                        ? {
                                            ...note,
                                            title: state.values.title,
                                            file: state.values.file,
                                            file_name: state.values.file_name,
                                            file_url: state.values.file_url,
                                          }
                                        : note,
                                    ),
                            }
                          : subsection,
                      ),
                    }
                  : section,
              ),
            }
          : phase,
      )
    })

    if (state.kind === 'phase') {
      openBranch(makeKey(['phase', state.mode === 'create' ? phases.length : state.phaseIndex ?? 0]))
    }
    if (state.kind === 'section') {
      openBranch(makeKey(['phase', state.phaseIndex]), makeKey(['section', state.phaseIndex, state.mode === 'create' ? phases[state.phaseIndex].sections.length : state.sectionIndex ?? 0]))
    }
    if (state.kind === 'subsection') {
        const targetSection = phases[state.phaseIndex].sections[state.sectionIndex]
        openBranch(
          makeKey(['phase', state.phaseIndex]),
          makeKey(['section', state.phaseIndex, state.sectionIndex]),
          makeKey([
            'subsection',
            state.phaseIndex,
            state.sectionIndex,
            state.mode === 'create' ? targetSection.subsections.length : state.subsectionIndex ?? 0,
          ]),
        )
    }
    if (state.kind === 'video' || state.kind === 'note') {
      openBranch(
        makeKey(['phase', state.phaseIndex]),
        makeKey(['section', state.phaseIndex, state.sectionIndex]),
        makeKey(['subsection', state.phaseIndex, state.sectionIndex, state.subsectionIndex]),
      )
    }

    setDraftState(null)
  }

  const removePhase = (phaseIndex: number) => {
    updatePhases((current) => current.filter((_, index) => index !== phaseIndex))
    setMenuState(null)
  }

  const removeSection = (phaseIndex: number, sectionIndex: number) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex ? { ...phase, sections: phase.sections.filter((_, childIndex) => childIndex !== sectionIndex) } : phase,
      ),
    )
    setMenuState(null)
  }

  const removeSubsection = (phaseIndex: number, sectionIndex: number, subsectionIndex: number) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, childIndex) =>
                childIndex === sectionIndex
                  ? {
                      ...section,
                      subsections: section.subsections.filter((_, itemIndex) => itemIndex !== subsectionIndex),
                    }
                  : section,
              ),
            }
          : phase,
      ),
    )
    setMenuState(null)
  }

  const removeVideo = (phaseIndex: number, sectionIndex: number, subsectionIndex: number, videoIndex: number) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, childIndex) =>
                childIndex === sectionIndex
                  ? {
                      ...section,
                      subsections: section.subsections.map((subsection, itemIndex) =>
                        itemIndex === subsectionIndex
                          ? {
                              ...subsection,
                              videos: subsection.videos.filter((_, materialIndex) => materialIndex !== videoIndex),
                            }
                          : subsection,
                      ),
                    }
                  : section,
              ),
            }
          : phase,
      ),
    )
    setMenuState(null)
  }

  const removeNote = (phaseIndex: number, sectionIndex: number, subsectionIndex: number, noteIndex: number) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, childIndex) =>
                childIndex === sectionIndex
                  ? {
                      ...section,
                      subsections: section.subsections.map((subsection, itemIndex) =>
                        itemIndex === subsectionIndex
                          ? {
                              ...subsection,
                              notes: subsection.notes.filter((_, materialIndex) => materialIndex !== noteIndex),
                            }
                          : subsection,
                      ),
                    }
                  : section,
              ),
            }
          : phase,
      ),
    )
    setMenuState(null)
  }

  const movePhase = (phaseIndex: number, delta: -1 | 1) => {
    updatePhases((current) => moveItem(current, phaseIndex, phaseIndex + delta))
    setMenuState(null)
  }

  const moveSection = (phaseIndex: number, sectionIndex: number, delta: -1 | 1) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex ? { ...phase, sections: moveItem(phase.sections, sectionIndex, sectionIndex + delta) } : phase,
      ),
    )
    setMenuState(null)
  }

  const moveSubsection = (phaseIndex: number, sectionIndex: number, subsectionIndex: number, delta: -1 | 1) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, childIndex) =>
                childIndex === sectionIndex
                  ? {
                      ...section,
                      subsections: moveItem(section.subsections, subsectionIndex, subsectionIndex + delta),
                    }
                  : section,
              ),
            }
          : phase,
      ),
    )
    setMenuState(null)
  }

  const moveVideo = (phaseIndex: number, sectionIndex: number, subsectionIndex: number, videoIndex: number, delta: -1 | 1) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, childIndex) =>
                childIndex === sectionIndex
                  ? {
                      ...section,
                      subsections: section.subsections.map((subsection, itemIndex) =>
                        itemIndex === subsectionIndex
                          ? {
                              ...subsection,
                              videos: moveItem(subsection.videos, videoIndex, videoIndex + delta),
                            }
                          : subsection,
                      ),
                    }
                  : section,
              ),
            }
          : phase,
      ),
    )
    setMenuState(null)
  }

  const moveNote = (phaseIndex: number, sectionIndex: number, subsectionIndex: number, noteIndex: number, delta: -1 | 1) => {
    updatePhases((current) =>
      current.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              sections: phase.sections.map((section, childIndex) =>
                childIndex === sectionIndex
                  ? {
                      ...section,
                      subsections: section.subsections.map((subsection, itemIndex) =>
                        itemIndex === subsectionIndex
                          ? {
                              ...subsection,
                              notes: moveItem(subsection.notes, noteIndex, noteIndex + delta),
                            }
                          : subsection,
                      ),
                    }
                  : section,
              ),
            }
          : phase,
      ),
    )
    setMenuState(null)
  }

  return (
    <div className="sv-outline-tree">
      <div className="sv-outline-tree__toolbar">
        <div>
          <div className="sv-selector-card__title">Course outline</div>
          <div className="sv-selector-card__sub">
            {phases.length} phases • {countCourseLessons(phases)} total content items
          </div>
        </div>
        {editable && (
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            disabled={disabled}
            onClick={() =>
              startCreate({
                mode: 'create',
                kind: 'phase',
                values: { name: '', description: '' },
              })
            }
          >
            Add phase
          </button>
        )}
      </div>

      <div className="sv-outline-tree__list">
        {phases.map((phase, phaseIndex) => {
          const phaseKey = makeKey(['phase', phaseIndex])
          const isPhaseExpanded = Boolean(expandedKeys[phaseKey])

          return (
            <div key={`${phase.id ?? 'phase'}-${phaseIndex}`} className="sv-outline-node sv-outline-node--phase">
              <div className="sv-outline-node__row">
                <button
                  className="sv-outline-node__toggle"
                  type="button"
                  aria-expanded={isPhaseExpanded}
                  onClick={() => toggleExpanded(phaseKey)}
                >
                  <span className={`sv-outline-node__chevron${isPhaseExpanded ? ' sv-outline-node__chevron--expanded' : ''}`}>
                    <Icon.Chevron />
                  </span>
                  <span className="sv-outline-node__icon sv-outline-node__icon--phase" aria-hidden>
                    <Icon.Chart />
                  </span>
                  <span className="sv-outline-node__content">
                    <span className="sv-outline-node__eyebrow">Phase {phaseIndex + 1}</span>
                    <span className="sv-outline-node__title">{phase.name || `Untitled phase ${phaseIndex + 1}`}</span>
                    <span className="sv-outline-node__meta">{getPhaseSummary(phase)}</span>
                  </span>
                </button>

                {editable && (
                  <div className="sv-outline-node__controls">
                    <button
                      className="sv-outline-node__action btn btn--ghost btn--sm"
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        startCreate({
                          mode: 'create',
                          kind: 'section',
                          phaseIndex,
                          values: { name: '' },
                        })
                      }
                    >
                      Add section
                    </button>
                    <div className="sv-outline-node__menu-wrap">
                      <button
                        className="sv-outline-node__menu-btn"
                        type="button"
                        disabled={disabled}
                        aria-label={`Open actions for ${phase.name || `phase ${phaseIndex + 1}`}`}
                        onClick={() =>
                          setMenuState((current) =>
                            current?.kind === 'phase' && current.phaseIndex === phaseIndex
                              ? null
                              : { kind: 'phase', phaseIndex },
                          )
                        }
                      >
                        <Icon.Dots />
                      </button>
                      {menuState?.kind === 'phase' && menuState.phaseIndex === phaseIndex && (
                        <div className="sv-outline-menu">
                          <button
                            type="button"
                            onClick={() =>
                              startEdit({
                                mode: 'edit',
                                kind: 'phase',
                                phaseIndex,
                                values: {
                                  name: phase.name,
                                  description: phase.description,
                                },
                              })
                            }
                          >
                            Edit
                          </button>
                          <button type="button" disabled={phaseIndex === 0} onClick={() => movePhase(phaseIndex, -1)}>
                            Move up
                          </button>
                          <button type="button" disabled={phaseIndex === phases.length - 1} onClick={() => movePhase(phaseIndex, 1)}>
                            Move down
                          </button>
                          <button type="button" className="sv-outline-menu__danger" onClick={() => removePhase(phaseIndex)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isPhaseExpanded && (
                <div className="sv-outline-node__body">
                  {phase.description && <p className="sv-outline-node__description">{phase.description}</p>}

                  {phase.sections.length === 0 ? (
                    <div className="sv-inline-note">No sections inside this phase yet.</div>
                  ) : (
                    <div className="sv-outline-children">
                      {phase.sections.map((section, sectionIndex) => {
                        const sectionKey = makeKey(['section', phaseIndex, sectionIndex])
                        const isSectionExpanded = Boolean(expandedKeys[sectionKey])

                        return (
                          <div key={`${section.id ?? 'section'}-${phaseIndex}-${sectionIndex}`} className="sv-outline-node">
                            <div className="sv-outline-node__row">
                              <button
                                className="sv-outline-node__toggle"
                                type="button"
                                aria-expanded={isSectionExpanded}
                                onClick={() => toggleExpanded(sectionKey)}
                              >
                                <span className={`sv-outline-node__chevron${isSectionExpanded ? ' sv-outline-node__chevron--expanded' : ''}`}>
                                  <Icon.Chevron />
                                </span>
                                <span className="sv-outline-node__icon" aria-hidden>
                                  <Icon.Document />
                                </span>
                                <span className="sv-outline-node__content">
                                  <span className="sv-outline-node__eyebrow">Section {sectionIndex + 1}</span>
                                  <span className="sv-outline-node__title">{section.name || `Untitled section ${sectionIndex + 1}`}</span>
                                  <span className="sv-outline-node__meta">{getSectionSummary(section)}</span>
                                </span>
                              </button>

                              {editable && (
                                <div className="sv-outline-node__controls">
                                  <button
                                    className="sv-outline-node__action btn btn--ghost btn--sm"
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                      startCreate({
                                        mode: 'create',
                                        kind: 'subsection',
                                        phaseIndex,
                                        sectionIndex,
                                        values: { name: '' },
                                      })
                                    }
                                  >
                                    Add subsection
                                  </button>
                                  <div className="sv-outline-node__menu-wrap">
                                    <button
                                      className="sv-outline-node__menu-btn"
                                      type="button"
                                      disabled={disabled}
                                      aria-label={`Open actions for ${section.name || `section ${sectionIndex + 1}`}`}
                                      onClick={() =>
                                        setMenuState((current) =>
                                          current?.kind === 'section' &&
                                          current.phaseIndex === phaseIndex &&
                                          current.sectionIndex === sectionIndex
                                            ? null
                                            : { kind: 'section', phaseIndex, sectionIndex },
                                        )
                                      }
                                    >
                                      <Icon.Dots />
                                    </button>
                                    {menuState?.kind === 'section' &&
                                      menuState.phaseIndex === phaseIndex &&
                                      menuState.sectionIndex === sectionIndex && (
                                        <div className="sv-outline-menu">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              startEdit({
                                                mode: 'edit',
                                                kind: 'section',
                                                phaseIndex,
                                                sectionIndex,
                                                values: { name: section.name },
                                              })
                                            }
                                          >
                                            Edit
                                          </button>
                                          <button type="button" disabled={sectionIndex === 0} onClick={() => moveSection(phaseIndex, sectionIndex, -1)}>
                                            Move up
                                          </button>
                                          <button
                                            type="button"
                                            disabled={sectionIndex === phase.sections.length - 1}
                                            onClick={() => moveSection(phaseIndex, sectionIndex, 1)}
                                          >
                                            Move down
                                          </button>
                                          <button
                                            type="button"
                                            className="sv-outline-menu__danger"
                                            onClick={() => removeSection(phaseIndex, sectionIndex)}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {isSectionExpanded && (
                              <div className="sv-outline-node__body">
                                {section.subsections.length === 0 ? (
                                  <div className="sv-inline-note">No subsections in this section yet.</div>
                                ) : (
                                  <div className="sv-outline-children">
                                    {section.subsections.map((subsection, subsectionIndex) => {
                                      const subsectionKey = makeKey(['subsection', phaseIndex, sectionIndex, subsectionIndex])
                                      const isSubsectionExpanded = Boolean(expandedKeys[subsectionKey])

                                      return (
                                        <div
                                          key={`${subsection.id ?? 'subsection'}-${phaseIndex}-${sectionIndex}-${subsectionIndex}`}
                                          className="sv-outline-node"
                                        >
                                          <div className="sv-outline-node__row">
                                            <button
                                              className="sv-outline-node__toggle"
                                              type="button"
                                              aria-expanded={isSubsectionExpanded}
                                              onClick={() => toggleExpanded(subsectionKey)}
                                            >
                                              <span
                                                className={`sv-outline-node__chevron${
                                                  isSubsectionExpanded ? ' sv-outline-node__chevron--expanded' : ''
                                                }`}
                                              >
                                                <Icon.Chevron />
                                              </span>
                                              <span className="sv-outline-node__icon" aria-hidden>
                                                <Icon.Document />
                                              </span>
                                              <span className="sv-outline-node__content">
                                                <span className="sv-outline-node__eyebrow">Subsection {subsectionIndex + 1}</span>
                                                <span className="sv-outline-node__title">
                                                  {subsection.name || `Untitled subsection ${subsectionIndex + 1}`}
                                                </span>
                                                <span className="sv-outline-node__meta">{getSubsectionSummary(subsection)}</span>
                                              </span>
                                            </button>

                                            {editable && (
                                              <div className="sv-outline-node__controls">
                                                <button
                                                  className="sv-outline-node__action btn btn--ghost btn--sm"
                                                  type="button"
                                                  disabled={disabled}
                                                  onClick={() =>
                                                    startCreate({
                                                      mode: 'create',
                                                      kind: 'video',
                                                      phaseIndex,
                                                      sectionIndex,
                                                      subsectionIndex,
                                                      values: { title: '', embed_code: '' },
                                                    })
                                                  }
                                                >
                                                  Add video
                                                </button>
                                                <button
                                                  className="sv-outline-node__action btn btn--ghost btn--sm"
                                                  type="button"
                                                  disabled={disabled}
                                                  onClick={() =>
                                                    startCreate({
                                                      mode: 'create',
                                                      kind: 'note',
                                                      phaseIndex,
                                                      sectionIndex,
                                                      subsectionIndex,
                                                      values: { title: '', file: null },
                                                    })
                                                  }
                                                >
                                                  Add note
                                                </button>
                                                <div className="sv-outline-node__menu-wrap">
                                                  <button
                                                    className="sv-outline-node__menu-btn"
                                                    type="button"
                                                    disabled={disabled}
                                                    aria-label={`Open actions for ${subsection.name || `subsection ${subsectionIndex + 1}`}`}
                                                    onClick={() =>
                                                      setMenuState((current) =>
                                                        current?.kind === 'subsection' &&
                                                        current.phaseIndex === phaseIndex &&
                                                        current.sectionIndex === sectionIndex &&
                                                        current.itemIndex === subsectionIndex
                                                          ? null
                                                          : {
                                                              kind: 'subsection',
                                                              phaseIndex,
                                                              sectionIndex,
                                                              itemIndex: subsectionIndex,
                                                            },
                                                      )
                                                    }
                                                  >
                                                    <Icon.Dots />
                                                  </button>
                                                  {menuState?.kind === 'subsection' &&
                                                    menuState.phaseIndex === phaseIndex &&
                                                    menuState.sectionIndex === sectionIndex &&
                                                    menuState.itemIndex === subsectionIndex && (
                                                      <div className="sv-outline-menu">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            startEdit({
                                                              mode: 'edit',
                                                              kind: 'subsection',
                                                              phaseIndex,
                                                              sectionIndex,
                                                              subsectionIndex,
                                                              values: { name: subsection.name },
                                                            })
                                                          }
                                                        >
                                                          Edit
                                                        </button>
                                                        <button
                                                          type="button"
                                                          disabled={subsectionIndex === 0}
                                                          onClick={() => moveSubsection(phaseIndex, sectionIndex, subsectionIndex, -1)}
                                                        >
                                                          Move up
                                                        </button>
                                                        <button
                                                          type="button"
                                                          disabled={subsectionIndex === section.subsections.length - 1}
                                                          onClick={() => moveSubsection(phaseIndex, sectionIndex, subsectionIndex, 1)}
                                                        >
                                                          Move down
                                                        </button>
                                                        <button
                                                          type="button"
                                                          className="sv-outline-menu__danger"
                                                          onClick={() => removeSubsection(phaseIndex, sectionIndex, subsectionIndex)}
                                                        >
                                                          Delete
                                                        </button>
                                                      </div>
                                                    )}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {isSubsectionExpanded && (
                                            <div className="sv-outline-node__body">
                                              {subsection.videos.length === 0 && subsection.notes.length === 0 ? (
                                                <div className="sv-inline-note">No videos or notes added to this subsection yet.</div>
                                              ) : (
                                                <div className="sv-outline-children">
                                                  {subsection.videos.map((video, videoIndex) => {
                                                    const videoKey = makeKey(['video', phaseIndex, sectionIndex, subsectionIndex, videoIndex])
                                                    const isVideoExpanded = Boolean(expandedKeys[videoKey])
                                                    const embedSrc = extractEmbedSrc(video.embed_code)

                                                    return (
                                                      <div
                                                        key={`${video.id ?? 'video'}-${phaseIndex}-${sectionIndex}-${subsectionIndex}-${videoIndex}`}
                                                        className="sv-outline-node sv-outline-node--leaf"
                                                      >
                                                        <div className="sv-outline-node__row">
                                                          <button
                                                            className="sv-outline-node__toggle"
                                                            type="button"
                                                            aria-expanded={isVideoExpanded}
                                                            onClick={() => toggleExpanded(videoKey)}
                                                          >
                                                            <span
                                                              className={`sv-outline-node__chevron${
                                                                isVideoExpanded ? ' sv-outline-node__chevron--expanded' : ''
                                                              }`}
                                                            >
                                                              <Icon.Chevron />
                                                            </span>
                                                            <span className="sv-outline-node__icon sv-outline-node__icon--video" aria-hidden>
                                                              <Icon.PlayCircle />
                                                            </span>
                                                            <span className="sv-outline-node__content">
                                                              <span className="sv-outline-node__eyebrow">Video {videoIndex + 1}</span>
                                                              <span className="sv-outline-node__title">
                                                                {video.title || `Untitled video ${videoIndex + 1}`}
                                                              </span>
                                                              <span className="sv-outline-node__meta">
                                                                {embedSrc ? 'Embed ready' : 'Embed missing or unsupported'}
                                                              </span>
                                                            </span>
                                                          </button>

                                                          {editable && (
                                                            <div className="sv-outline-node__controls">
                                                              <div className="sv-outline-node__menu-wrap">
                                                                <button
                                                                  className="sv-outline-node__menu-btn"
                                                                  type="button"
                                                                  disabled={disabled}
                                                                  aria-label={`Open actions for ${video.title || `video ${videoIndex + 1}`}`}
                                                                  onClick={() =>
                                                                    setMenuState((current) =>
                                                                      current?.kind === 'video' &&
                                                                      current.phaseIndex === phaseIndex &&
                                                                      current.sectionIndex === sectionIndex &&
                                                                      current.subsectionIndex === subsectionIndex &&
                                                                      current.itemIndex === videoIndex
                                                                        ? null
                                                                        : {
                                                                            kind: 'video',
                                                                            phaseIndex,
                                                                            sectionIndex,
                                                                            subsectionIndex,
                                                                            itemIndex: videoIndex,
                                                                          },
                                                                    )
                                                                  }
                                                                >
                                                                  <Icon.Dots />
                                                                </button>
                                                                {menuState?.kind === 'video' &&
                                                                  menuState.phaseIndex === phaseIndex &&
                                                                  menuState.sectionIndex === sectionIndex &&
                                                                  menuState.subsectionIndex === subsectionIndex &&
                                                                  menuState.itemIndex === videoIndex && (
                                                                    <div className="sv-outline-menu">
                                                                      <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                          startEdit({
                                                                            mode: 'edit',
                                                                            kind: 'video',
                                                                            phaseIndex,
                                                                            sectionIndex,
                                                                            subsectionIndex,
                                                                            itemIndex: videoIndex,
                                                                            values: {
                                                                              title: video.title,
                                                                              embed_code: video.embed_code,
                                                                            },
                                                                          })
                                                                        }
                                                                      >
                                                                        Edit
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        disabled={videoIndex === 0}
                                                                        onClick={() =>
                                                                          moveVideo(phaseIndex, sectionIndex, subsectionIndex, videoIndex, -1)
                                                                        }
                                                                      >
                                                                        Move up
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        disabled={videoIndex === subsection.videos.length - 1}
                                                                        onClick={() =>
                                                                          moveVideo(phaseIndex, sectionIndex, subsectionIndex, videoIndex, 1)
                                                                        }
                                                                      >
                                                                        Move down
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        className="sv-outline-menu__danger"
                                                                        onClick={() =>
                                                                          removeVideo(phaseIndex, sectionIndex, subsectionIndex, videoIndex)
                                                                        }
                                                                      >
                                                                        Delete
                                                                      </button>
                                                                    </div>
                                                                  )}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>

                                                        {isVideoExpanded && (
                                                          <div className="sv-outline-node__body">
                                                            {embedSrc ? (
                                                              <div className="sv-video-embed">
                                                                <iframe
                                                                  src={embedSrc}
                                                                  title={video.title || `Video ${videoIndex + 1}`}
                                                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                  allowFullScreen
                                                                />
                                                              </div>
                                                            ) : (
                                                              <div className="sv-inline-note">
                                                                Add a supported YouTube or Vimeo embed to preview this lesson here.
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )
                                                  })}

                                                  {subsection.notes.map((note, noteIndex) => {
                                                    const noteKey = makeKey(['note', phaseIndex, sectionIndex, subsectionIndex, noteIndex])
                                                    const isNoteExpanded = Boolean(expandedKeys[noteKey])

                                                    return (
                                                      <div
                                                        key={`${note.id ?? 'note'}-${phaseIndex}-${sectionIndex}-${subsectionIndex}-${noteIndex}`}
                                                        className="sv-outline-node sv-outline-node--leaf"
                                                      >
                                                        <div className="sv-outline-node__row">
                                                          <button
                                                            className="sv-outline-node__toggle"
                                                            type="button"
                                                            aria-expanded={isNoteExpanded}
                                                            onClick={() => toggleExpanded(noteKey)}
                                                          >
                                                            <span
                                                              className={`sv-outline-node__chevron${
                                                                isNoteExpanded ? ' sv-outline-node__chevron--expanded' : ''
                                                              }`}
                                                            >
                                                              <Icon.Chevron />
                                                            </span>
                                                            <span className="sv-outline-node__icon" aria-hidden>
                                                              <Icon.Document />
                                                            </span>
                                                            <span className="sv-outline-node__content">
                                                              <span className="sv-outline-node__eyebrow">Note {noteIndex + 1}</span>
                                                              <span className="sv-outline-node__title">
                                                                {note.title || note.file_name || `Untitled note ${noteIndex + 1}`}
                                                              </span>
                                                              <span className="sv-outline-node__meta">
                                                                {note.file_name || note.file_url ? 'Attachment ready' : 'No file attached'}
                                                              </span>
                                                            </span>
                                                          </button>

                                                          {editable && (
                                                            <div className="sv-outline-node__controls">
                                                              <div className="sv-outline-node__menu-wrap">
                                                                <button
                                                                  className="sv-outline-node__menu-btn"
                                                                  type="button"
                                                                  disabled={disabled}
                                                                  aria-label={`Open actions for ${note.title || `note ${noteIndex + 1}`}`}
                                                                  onClick={() =>
                                                                    setMenuState((current) =>
                                                                      current?.kind === 'note' &&
                                                                      current.phaseIndex === phaseIndex &&
                                                                      current.sectionIndex === sectionIndex &&
                                                                      current.subsectionIndex === subsectionIndex &&
                                                                      current.itemIndex === noteIndex
                                                                        ? null
                                                                        : {
                                                                            kind: 'note',
                                                                            phaseIndex,
                                                                            sectionIndex,
                                                                            subsectionIndex,
                                                                            itemIndex: noteIndex,
                                                                          },
                                                                    )
                                                                  }
                                                                >
                                                                  <Icon.Dots />
                                                                </button>
                                                                {menuState?.kind === 'note' &&
                                                                  menuState.phaseIndex === phaseIndex &&
                                                                  menuState.sectionIndex === sectionIndex &&
                                                                  menuState.subsectionIndex === subsectionIndex &&
                                                                  menuState.itemIndex === noteIndex && (
                                                                    <div className="sv-outline-menu">
                                                                      <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                          startEdit({
                                                                            mode: 'edit',
                                                                            kind: 'note',
                                                                            phaseIndex,
                                                                            sectionIndex,
                                                                            subsectionIndex,
                                                                            itemIndex: noteIndex,
                                                                            values: {
                                                                              title: note.title,
                                                                              file: note.file,
                                                                              file_name: note.file_name,
                                                                              file_url: note.file_url,
                                                                            },
                                                                          })
                                                                        }
                                                                      >
                                                                        Edit
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        disabled={noteIndex === 0}
                                                                        onClick={() => moveNote(phaseIndex, sectionIndex, subsectionIndex, noteIndex, -1)}
                                                                      >
                                                                        Move up
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        disabled={noteIndex === subsection.notes.length - 1}
                                                                        onClick={() => moveNote(phaseIndex, sectionIndex, subsectionIndex, noteIndex, 1)}
                                                                      >
                                                                        Move down
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        className="sv-outline-menu__danger"
                                                                        onClick={() => removeNote(phaseIndex, sectionIndex, subsectionIndex, noteIndex)}
                                                                      >
                                                                        Delete
                                                                      </button>
                                                                    </div>
                                                                  )}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>

                                                        {isNoteExpanded && (
                                                          <div className="sv-outline-node__body">
                                                            {note.file_url ? (
                                                              <a className="sv-outline-preview__note-link" href={note.file_url} target="_blank" rel="noreferrer">
                                                                Open attachment
                                                              </a>
                                                            ) : note.file_name ? (
                                                              <div className="sv-inline-note">{note.file_name}</div>
                                                            ) : (
                                                              <div className="sv-inline-note">Upload a note file to make this resource available.</div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <OutlineDialog
        state={draftState}
        disabled={disabled}
        onClose={() => {
          setDraftState(null)
        }}
        onChange={setDraftState}
        onSave={applyModal}
      />
    </div>
  )
}

export function CourseOutlineEditor({
  phases,
  onChange,
  disabled = false,
}: {
  phases: EditableCoursePhase[]
  onChange: (phases: EditableCoursePhase[]) => void
  disabled?: boolean
}) {
  return <OutlineTree phases={phases} onChange={onChange} editable disabled={disabled} />
}

export function CourseOutlinePreview({
  phases,
  emptyMessage = 'No phases have been added yet.',
}: {
  phases: CoursePhase[]
  emptyMessage?: string
}) {
  return <OutlineTree phases={normalizeEditablePhases(phases)} emptyMessage={emptyMessage} />
}
