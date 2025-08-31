"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import * as ProgressPrimitive from "@radix-ui/react-progress";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // Make sure the value is scaled between 0 and 100 for each 25% increment
  const scaledValue = Math.min(Math.max(value! * 25, 0), 100); // Ensures the value stays within the range of 0 to 100

  // Determine the color based on the scaled value
  let strengthColor = "bg-red-500"; // Default red (weak)
  if (scaledValue > 25 && scaledValue < 90) {
    strengthColor = "bg-yellow-500"; // Fair strength (yellow)
  } else if (scaledValue >= 90) {
    strengthColor = "bg-green-700"; // Strong strength (green)
  }

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={`h-full w-full flex-1 transition-all duration-200 ${strengthColor}`}
        style={{ transform: `translateX(-${100 - scaledValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
