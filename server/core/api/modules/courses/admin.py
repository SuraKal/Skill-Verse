from django.contrib import admin

from ...models import (
    Course,
    CoursePhase,
    CoursePhaseSection,
    CourseSection,
    CourseSubsection,
    CourseSubsectionNote,
    CourseSubsectionVideo,
)


class CoursePhaseSectionInline(admin.TabularInline):
    model = CoursePhaseSection
    extra = 0


class CourseSubsectionVideoInline(admin.TabularInline):
    model = CourseSubsectionVideo
    extra = 0


class CourseSubsectionNoteInline(admin.TabularInline):
    model = CourseSubsectionNote
    extra = 0


@admin.register(CourseSection)
class CourseSectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(CoursePhase)
class CoursePhaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'order', 'created_at')
    list_filter = ('course',)
    search_fields = ('name', 'course__title')
    inlines = [CoursePhaseSectionInline]


@admin.register(CourseSubsection)
class CourseSubsectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'course_section', 'order', 'created_at')
    list_filter = ('course_section__phase__course',)
    search_fields = ('name', 'course_section__section__name', 'course_section__phase__course__title')
    inlines = [CourseSubsectionVideoInline, CourseSubsectionNoteInline]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'is_visible', 'privacy', 'price_type', 'updated_at')
    list_filter = ('is_visible', 'privacy', 'price_type')
    search_fields = ('title', 'description', 'created_by__email')
