from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask


class Command(BaseCommand):
    help = "Clean up duplicate Celery schedules and tasks"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        self.stdout.write("Cleaning up Celery schedules...")
        
        # Check current state
        total_schedules = CrontabSchedule.objects.count()
        total_tasks = PeriodicTask.objects.count()
        
        self.stdout.write(f"Current state: {total_schedules} schedules, {total_tasks} tasks")
        
        # Find duplicate schedules
        duplicates = CrontabSchedule.objects.filter(
            minute='*', 
            hour='*', 
            day_of_week='*', 
            month_of_year='*'
        )
        
        if duplicates.count() > 1:
            self.stdout.write(f"Found {duplicates.count()} duplicate schedules:")
            for dup in duplicates:
                self.stdout.write(f"  - ID: {dup.id}")
            
            if not options['dry_run']:
                # Keep the first one, delete the rest
                first_id = duplicates.first().id
                duplicates_to_delete = duplicates.exclude(id=first_id)
                
                self.stdout.write(f"Deleting {duplicates_to_delete.count()} duplicate schedules...")
                duplicates_to_delete.delete()
                
                self.stdout.write(
                    self.style.SUCCESS("✓ Duplicate schedules removed successfully!")
                )
            else:
                self.stdout.write(
                    self.style.WARNING("DRY RUN: Would delete duplicate schedules")
                )
        else:
            self.stdout.write("No duplicate schedules found.")
        
        # Check for orphaned tasks
        orphaned_tasks = PeriodicTask.objects.filter(
            crontab__isnull=True,
            interval__isnull=True,
            solar__isnull=True
        )
        
        if orphaned_tasks.exists():
            self.stdout.write(f"Found {orphaned_tasks.count()} orphaned tasks:")
            for task in orphaned_tasks:
                self.stdout.write(f"  - {task.name} (ID: {task.id})")
            
            if not options['dry_run']:
                orphaned_tasks.delete()
                self.stdout.write(
                    self.style.SUCCESS("✓ Orphaned tasks removed successfully!")
                )
            else:
                self.stdout.write(
                    self.style.WARNING("DRY RUN: Would delete orphaned tasks")
                )
        
        # Final state
        final_schedules = CrontabSchedule.objects.count()
        final_tasks = PeriodicTask.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f"\nFinal state: {final_schedules} schedules, {final_tasks} tasks"
            )
        ) 