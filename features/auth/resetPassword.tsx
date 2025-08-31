"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { resetPasswordAction } from "@/actions/users/resetPassword";
import { validateVerificationParamsAction } from "@/lib/verification";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "react-day-picker";

// Enhanced password strength checker with pattern detection
const getPasswordStrength = (password: string) => {
  if (!password) return { 
    score: 0, 
    label: "Very Weak", 
    color: "bg-red-500",
    feedback: [],
    suggestions: ["Start typing to see password strength"]
  };

  let score = 0;
  const feedback: string[] = [];
  const suggestions: string[] = [];

  // Basic character type checks
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // Calculate base score
  score += checks.length ? 1 : 0;
  score += checks.lowercase ? 1 : 0;
  score += checks.uppercase ? 1 : 0;
  score += checks.number ? 1 : 0;
  score += checks.special ? 1 : 0;

  // Pattern detection and penalties
  const patterns = {
    sequential: /(?:012|123|234|345|456|567|678|789|890|617|608|849|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password),
    repeated: /(.)\1{2,}/.test(password),
    allNumbers: /^\d+$/.test(password),
    allLetters: /^[a-zA-Z]+$/.test(password),
    commonPatterns: /^(123|321|000|111|222|333|444|555|666|777|888|999|abc|qwe|asd|zxc)$/i.test(password),
    years: /^(19|20)\d{2}$/.test(password), // Years 1900-2099
    phonePattern: /^\d{7,11}$/.test(password), // Phone number patterns
  };

  // Apply penalties for weak patterns
  if (patterns.sequential) {
    score = Math.max(0, score - 2);
    feedback.push("Contains sequential characters");
    suggestions.push("Avoid sequential patterns like '123' or 'abc'");
  }

  if (patterns.repeated) {
    score = Math.max(0, score - 2);
    feedback.push("Contains repeated characters");
    suggestions.push("Avoid repeated characters like 'aaa' or '111'");
  }

  if (patterns.allNumbers) {
    score = Math.max(0, score - 1);
    feedback.push("Contains only numbers");
    suggestions.push("Add letters and special characters for better security");
  }

  if (patterns.allLetters) {
    score = Math.max(0, score - 1);
    feedback.push("Contains only letters");
    suggestions.push("Add numbers and special characters for better security");
  }

  if (patterns.commonPatterns) {
    score = Math.max(0, score - 3);
    feedback.push("Common weak pattern detected");
    suggestions.push("Avoid common patterns like '123' or 'qwe'");
  }

  if (patterns.years) {
    score = Math.max(0, score - 1);
    feedback.push("Looks like a year");
    suggestions.push("Avoid using years as passwords");
  }

  if (patterns.phonePattern) {
    score = Math.max(0, score - 1);
    feedback.push("Looks like a phone number");
    suggestions.push("Avoid using phone numbers as passwords");
  }

  // Add positive suggestions based on what's missing
  if (!checks.length) {
    suggestions.push("Make it at least 8 characters long");
  }
  if (!checks.lowercase) {
    suggestions.push("Add lowercase letters");
  }
  if (!checks.uppercase) {
    suggestions.push("Add uppercase letters");
  }
  if (!checks.number) {
    suggestions.push("Add numbers");
  }
  if (!checks.special) {
    suggestions.push("Add special characters like !@#$%");
  }

  // Calculate entropy for additional insight
  const uniqueChars = new Set(password).size;
  const entropy = Math.log2(Math.pow(uniqueChars, password.length));
  
  if (entropy < 20) {
    feedback.push("Low entropy - too predictable");
    suggestions.push("Use more random characters");
  }

  // Determine final strength
  let label = "Very Weak";
  let color = "bg-red-500";

  if (score >= 4 && entropy >= 30) {
    label = "Strong";
    color = "bg-green-500";
  } else if (score >= 3 && entropy >= 20) {
    label = "Good";
    color = "bg-blue-500";
  } else if (score >= 2) {
    label = "Fair";
    color = "bg-yellow-500";
  } else if (score >= 1) {
    label = "Weak";
    color = "bg-orange-500";
  }

  return { 
    score: Math.min(5, Math.max(0, score)), 
    label, 
    color,
    feedback,
    suggestions,
    entropy: Math.round(entropy)
  };
};

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .refine(
        (val) => {
          if (!val) return false;
          const result = getPasswordStrength(val);
          return result.score >= 3 && (result.entropy || 0) >= 20;
        },
        {
          message:
            "Password is too weak. Avoid predictable patterns and use a mix of characters.",
        }
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
    suggestions: string[];
    entropy?: number;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);

  const form = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Password strength validation
  const validatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    const result = getPasswordStrength(password);
    setPasswordStrength({
      score: result.score,
      feedback: result.feedback,
      suggestions: result.suggestions,
      entropy: result.entropy,
    });
  };

  // Watch password changes for real-time validation
  const watchedPassword = form.watch("password");
  useEffect(() => {
    validatePasswordStrength(watchedPassword);
  }, [watchedPassword]);

  // Validate secure token and extract email
  useEffect(() => {
    const validateAccess = async () => {
      const token = searchParams.get("token");

      if (!token) {
        toast.error(
          "Invalid access. Please complete the password reset process.",
          {
            className: "bg-red-600 text-white rounded-lg shadow-lg",
            icon: <AlertTriangle size={20} className="text-white" />,
          }
        );
        router.replace("/forget-password");
        return;
      }

      try {
        const validation = await validateVerificationParamsAction(
          token,
          "password-reset"
        );

        if (!validation.valid) {
          toast.error(validation.error || "Invalid or expired reset link", {
            className: "bg-red-600 text-white rounded-lg shadow-lg",
            icon: <AlertTriangle size={20} className="text-white" />,
          });
          router.replace("/forget-password");
          return;
        }

        setEmail(validation.email || null);
        setIsValidating(false);
      } catch (error) {
        console.error("Token validation error:", error);
        toast.error("Invalid reset link", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        router.replace("/forget-password");
        return;
      }
    };

    validateAccess();
  }, [searchParams, router]);

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordSchemaType) => {
      if (!email) {
        toast.error("Email is required for password reset", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        return;
      }
      const res = await resetPasswordAction(email, data.password);
      return res;
    },
    async onSuccess(data) {
      console.log("data", data);
      if (data?.error) {
        toast.error(data.message || "Failed to reset password", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        return;
      }
      toast.success(data?.message || "Password reset successfully!", {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });

      router.replace("/sign-in?message=password-reset-success");
    },
    async onError(error: any) {
      const msg = error.message || "Failed to reset password";
      toast.error(msg, {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
    },
  });

  const onSubmit = (data: ResetPasswordSchemaType) => {
    mutation.mutate(data);
  };

  if (isValidating) {
    return (
      <div className="w-full">
        <div className="flex flex-col justify-center items-center min-h-[200px] text-center">
          <div className="mb-4 w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="w-full">
        <div className="flex flex-col justify-center items-center min-h-[200px] text-center">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Invalid Reset Link
          </h3>
          <p className="mb-4 text-gray-600">
            This password reset link is invalid or has expired. Please try
            requesting a password reset again.
          </p>
          <button
            onClick={() => router.replace("/forget-password")}
            className="px-4 py-2 text-white rounded-lg transition-colors bg-primary hover:bg-primary/90"
          >
            Return to Forgot Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-6 w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 w-full"
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={mutation.isPending}
                      className="block px-3 py-2 pr-10 mt-1 w-full h-11 rounded-md border border-gray-300 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      placeholder="Enter your new password"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 z-10 text-gray-400 -translate-y-1/2 hover:text-primary focus:outline-none"
                      style={{ height: "1.5rem", width: "1.5rem" }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
                {form.watch("password") && !form.formState.errors.password && (
                  <p className="text-xs text-green-500">
                    Password is strong enough
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={mutation.isPending}
                      className="block px-3 py-2 pr-10 mt-1 w-full h-11 rounded-md border border-gray-300 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      placeholder="Confirm your new password"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 z-10 text-gray-400 -translate-y-1/2 hover:text-primary focus:outline-none"
                      style={{ height: "1.5rem", width: "1.5rem" }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Strength Indicator */}
          {passwordStrength && watchedPassword && (
            <div className="p-4 mt-4 bg-gray-50 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Password Strength
                </span>
                <div className="flex items-center space-x-2">
                  {passwordStrength?.score >= 3 ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength?.score >= 3
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {passwordStrength?.score >= 3 ? "Strong" : "Weak"}
                  </span>
                </div>
              </div>

              {/* Strength Bar */}
              <div className="mb-3 w-full h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength?.score === 0
                      ? "bg-red-500"
                      : passwordStrength?.score === 1
                      ? "bg-orange-500"
                      : passwordStrength?.score === 2
                      ? "bg-yellow-500"
                      : passwordStrength?.score === 3
                      ? "bg-blue-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${(passwordStrength?.score || 0 + 1) * 20}%`,
                  }}
                />
              </div>

              {/* Feedback and Suggestions */}
              {((passwordStrength?.feedback?.length || 0) > 0 ||
                (passwordStrength?.suggestions?.length || 0) > 0) && (
                <div className="space-y-2">
                  {passwordStrength?.feedback?.map((feedback, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <XCircle
                        size={14}
                        className="text-red-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-xs text-red-600">{feedback}</span>
                    </div>
                  ))}
                  {passwordStrength?.suggestions?.map((suggestion, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle
                        size={14}
                        className="text-blue-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-xs text-blue-600">
                        {suggestion}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Entropy Information */}
              {passwordStrength && watchedPassword && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Entropy:</span>
                    <span className="font-medium">
                      {passwordStrength.entropy || 0} bits
                    </span>
                  </div>
                </div>
              )}

              {/* Requirements List */}
              <div className="pt-3 mt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`flex items-center space-x-1 ${
                      watchedPassword.length >= 8
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {watchedPassword.length >= 8 ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>At least 8 characters</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      /[A-Z]/.test(watchedPassword)
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {/[A-Z]/.test(watchedPassword) ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Uppercase letter</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      /[a-z]/.test(watchedPassword)
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {/[a-z]/.test(watchedPassword) ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Lowercase letter</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      /\d/.test(watchedPassword)
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {/\d/.test(watchedPassword) ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Number</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      /[^A-Za-z0-9]/.test(watchedPassword)
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {/[^A-Za-z0-9]/.test(watchedPassword) ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Special character</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      passwordStrength?.score >= 3
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {passwordStrength?.score >= 3 ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Strong enough</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={
              mutation.isPending ||
              !form.watch("password") ||
              !form.watch("confirmPassword") ||
              form.watch("password") !== form.watch("confirmPassword") ||
              (passwordStrength ? passwordStrength.score < 3 : true)
            }
            className="flex justify-center px-4 py-2 w-full h-11 text-sm font-medium text-white rounded-md border border-transparent shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {mutation.isPending ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>
      </Form>

      <div className="flex justify-center items-center mt-4">
        <Link
          href="/sign-in"
          className="flex items-center text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
