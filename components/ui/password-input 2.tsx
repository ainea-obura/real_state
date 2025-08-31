"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";
import zxcvbn from "zxcvbn";

import { Button } from "@/components/ui/button";
import { Input, InputProps } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [passwordStrength, setPasswordStrength] = React.useState<{
      score: number;
    }>({ score: 0 });

    const disabled =
      props.value === "" || props.value === undefined || props.disabled;

    // Handle password change
    const handlePasswordChange = (e: React.FormEvent<HTMLInputElement>) => {
      const password = e.currentTarget.value;
      const result = zxcvbn(password);
      setPasswordStrength({ score: result.score });
      props.onChange?.(e); // update the react-hook-form state
    };

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("hide-password-toggle pr-10", className)}
          ref={ref}
          {...props}
          onChange={handlePasswordChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="right-0 bottom-[45%] absolute hover:bg-transparent cursor-pointer"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
        >
          {showPassword && !disabled ? (
            <EyeIcon className="w-6 h-6 cursor-pointer" aria-hidden="true" />
          ) : (
            <EyeOffIcon className="w-6 h-6 cursor-pointer" aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>

        {/* Password strength indicator */}
        <div className="mt-2 rounded-full h-4 password-strength-meter">
          <Progress
            className={`password-strength-meter-progress w-full rounded-full`}
            value={passwordStrength.score}
            max={4}
          />
        </div>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
