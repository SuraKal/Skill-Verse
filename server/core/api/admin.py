"""Admin bootstrap that loads feature-specific admin registrations."""

from .modules.organizations import admin as _organization_admin  # noqa: F401
from .modules.courses import admin as _course_admin  # noqa: F401
from .modules.skill_swap import admin as _skill_swap_admin  # noqa: F401
