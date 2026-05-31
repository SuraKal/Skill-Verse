import re
from collections import OrderedDict

from django.db import transaction

from ...models import SkillChatThread, SkillMatch, SkillSwapProfile

SKILL_SPLIT_PATTERN = re.compile(r'[\n,;|]+')


def split_skill_text(raw_text: str) -> list[str]:
    if not raw_text:
        return []

    terms: list[str] = []
    for chunk in SKILL_SPLIT_PATTERN.split(raw_text):
        normalized = ' '.join(chunk.strip().split())
        if normalized:
            terms.append(normalized)
    return terms


def normalize_skill_key(raw_skill: str) -> str:
    return ' '.join(raw_skill.split()).strip().lower()


def canonical_skill_name(raw_skill: str) -> str:
    cleaned = ' '.join(raw_skill.split()).strip()
    if not cleaned:
        return ''
    return cleaned[:1].upper() + cleaned[1:]


def skill_map(raw_text: str) -> dict[str, str]:
    mapped = OrderedDict()
    for skill in split_skill_text(raw_text):
        key = normalize_skill_key(skill)
        if key and key not in mapped:
            mapped[key] = canonical_skill_name(skill)
    return dict(mapped)


def build_skill_sets(profile: SkillSwapProfile) -> tuple[dict[str, str], dict[str, str]]:
    return skill_map(profile.teach_skills), skill_map(profile.learn_skills)


def rebuild_skill_matches() -> None:
    profiles = list(SkillSwapProfile.objects.select_related('user').all())

    with transaction.atomic():
        SkillMatch.objects.update(is_active=False)

        for teaching_profile in profiles:
            teach_map, _ = build_skill_sets(teaching_profile)
            if not teach_map:
                continue

            for learning_profile in profiles:
                if teaching_profile.user_id == learning_profile.user_id:
                    continue

                _, learn_map = build_skill_sets(learning_profile)
                if not learn_map:
                    continue

                overlap_keys = sorted(set(teach_map).intersection(learn_map))
                for skill_key in overlap_keys:
                    match, _ = SkillMatch.objects.get_or_create(
                        teaching_user=teaching_profile.user,
                        learning_user=learning_profile.user,
                        matched_skill=teach_map[skill_key],
                        defaults={
                            'teaching_text': teach_map[skill_key],
                            'learning_text': learn_map[skill_key],
                            'match_score': 100,
                            'is_active': True,
                        },
                    )
                    match.teaching_text = teach_map[skill_key]
                    match.learning_text = learn_map[skill_key]
                    match.match_score = 100
                    match.is_active = True
                    match.save(update_fields=['teaching_text', 'learning_text', 'match_score', 'is_active', 'updated_at'])
                    SkillChatThread.objects.get_or_create(match=match)

