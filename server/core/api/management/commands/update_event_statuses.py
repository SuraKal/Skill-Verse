from django.core.management.base import BaseCommand

from api.modules.events.services import run_event_lifecycle_jobs


class Command(BaseCommand):
    help = 'Advance event lifecycle statuses from ACTIVE to ONGOING and ONGOING to COMPLETED.'

    def handle(self, *args, **kwargs):
        result = run_event_lifecycle_jobs()
        self.stdout.write(
            self.style.SUCCESS(
                f'Updated event statuses: activated={result["activated"]}, completed={result["completed"]}'
            )
        )
