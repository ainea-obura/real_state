"use client";

import { CheckCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

// ButtonGroup component wraps the RadioGroupPrimitive.Root
const ButtonGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("flex gap-5", className)}
      {...props}
      ref={ref}
    />
  );
});
ButtonGroup.displayName = RadioGroupPrimitive.Root.displayName;

// ButtonGroupItem is used to represent each radio button item
const ButtonGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  {
    icon: React.ReactNode;
    heading: string;
    subHeading: string;
    value: string; // Add value prop to bind with RadioGroup
  } & React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, icon, heading, subHeading, value, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      value={value} // Binding value to RadioGroupItem
      className={cn(
        "border data-[state=checked]:bg-background text-center h-[125px] w-full rounded-md focus:outline-none focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.RadioGroupIndicator className="relative">
        <div className="relative">
          <div className="top-0 right-5 absolute -ml-2">
            <CheckCircle className="text-primary" />
          </div>
        </div>
      </RadioGroupPrimitive.RadioGroupIndicator>

      <div className="flex justify-start items-start gap-4 p-4">
        <div className="bg-primary p-2 rounded-md w-10 h-10 text-white">
          {icon}
        </div>
        <div className="flex flex-col items-start w-full">
          <h1 className="">{heading}</h1>
          <p className="w-full text-gray-500 text-sm text-left">{subHeading}</p>
        </div>
      </div>
    </RadioGroupPrimitive.Item>
  );
});
ButtonGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { ButtonGroup, ButtonGroupItem };
