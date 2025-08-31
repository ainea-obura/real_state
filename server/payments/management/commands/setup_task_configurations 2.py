from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import TaskConfiguration


class Command(BaseCommand):
    help = "Set up default task configurations for Celery tasks"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recreation of existing configurations",
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up task configurations...")

        # Default configurations
        default_configs = [
            {
                "task_type": "invoice_generation",
                "enabled": True,
                "frequency": "daily",
                "time": timezone.now()
                .time()
                .replace(hour=9, minute=0, second=0, microsecond=0),
                "execution_frequency": "once_daily",
                "status": "active",
                "notes": "Auto-generated invoice creation task",
            },
            {
                "task_type": "invoice_reminders",
                "enabled": True,
                "frequency": "daily",
                "time": timezone.now()
                .time()
                .replace(hour=10, minute=0, second=0, microsecond=0),
                "execution_frequency": "once_daily",
                "status": "active",
                "before_due_days": 2,
                "after_due_days": 1,
                "notes": "Auto-generated invoice reminder task",
            },
        ]

        created_count = 0
        updated_count = 0

        for config_data in default_configs:
            task_type = config_data["task_type"]

            try:
                config, created = TaskConfiguration.objects.get_or_create(
                    task_type=task_type, defaults=config_data
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Created {task_type} configuration")
                    )
                    created_count += 1
                elif options["force"]:
                    # Update existing configuration
                    for key, value in config_data.items():
                        setattr(config, key, value)
                    config.save()
                    self.stdout.write(
                        self.style.WARNING(f"✓ Updated {task_type} configuration")
                    )
                    updated_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠ {task_type} configuration already exists (use --force to update)"
                        )
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ Error creating {task_type} configuration: {e}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nTask configuration setup complete: {created_count} created, {updated_count} updated"
            )
        )
