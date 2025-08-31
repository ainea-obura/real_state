"use client";

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  minDate?: Date;
}

export default function DatePicker({
  value,
  onChange,
  minDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      onChange?.(date);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full h-11 justify-start text-left font-normal bg-background hover:bg-accent hover:text-accent-foreground",
            !value && "text-muted-foreground"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <CalendarIcon className="mr-2 w-4 h-4" />
          {value ? format(value, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          fromDate={minDate}
          initialFocus
          className="border rounded-md"
        />
      </PopoverContent>
    </Popover>
  );
}
