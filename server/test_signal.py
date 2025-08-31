#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'src.settings')
django.setup()

from payments.models import TaskConfiguration
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_signal():
    """Test if the signal is working properly"""
    try:
        # Get the invoice generation config
        config = TaskConfiguration.objects.get(task_type='invoice_generation')
        print(f"Current config: {config.task_type}")
        print(f"Current execution_frequency: {config.execution_frequency}")
        print(f"Current enabled: {config.enabled}")
        
        # Change the execution frequency
        old_frequency = config.execution_frequency
        new_frequency = 'every_minute' if old_frequency != 'every_minute' else 'every_hour'
        
        print(f"Changing execution_frequency from {old_frequency} to {new_frequency}")
        config.execution_frequency = new_frequency
        config.save()
        
        print(f"✅ Config saved. New execution_frequency: {config.execution_frequency}")
        
        # Check if the schedule was updated
        from django_celery_beat.models import PeriodicTask
        pt = PeriodicTask.objects.get(name='invoice_generation-task')
        print(f"✅ Schedule updated: {pt.crontab}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_signal() 