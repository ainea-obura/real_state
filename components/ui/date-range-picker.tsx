"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "./calendar"
import { addDays, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { type DateRange } from "react-day-picker"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  setDate?: (date: DateRange | undefined) => void;
}

export default function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -20),
    to: new Date(),
  })

  const dateValue = date || internalDate
  const dateHandler = setDate || setInternalDate

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "border-dashed bg-primary/5 hover:bg-primary/10 h-9",
              "justify-start text-left font-normal",
              "hover:border-primary/50 transition-colors duration-300",
              !dateValue && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
            {dateValue?.from ? (
              dateValue.to ? (
                <>
                  <span className="text-primary/90">
                    {format(dateValue.from, "LLL dd, y")}
                  </span>
                  <span className="mx-2 text-muted-foreground">to</span>
                  <span className="text-primary/90">
                    {format(dateValue.to, "LLL dd, y")}
                  </span>
                </>
              ) : (
                format(dateValue.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-white/95 backdrop-blur-sm"
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateValue?.from}
            selected={dateValue}
            onSelect={dateHandler}
            numberOfMonths={2}
            className="border-none"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}