"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { changePasswordAction } from '@/actions/users/changePassword';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { ChangePasswordForm, changePasswordSchema } from '../../schema/change-password';

interface ChangePasswordProps {
  isForceChange?: boolean;
}

function clearAllCookies() {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie =
      name +
      "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" +
      window.location.pathname;
  }
}

const ChangePassword = ({ isForceChange = false }: ChangePasswordProps) => {
  useSession();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const newPassword = form.watch("new_password");

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

  const passwordStrength = getPasswordStrength(newPassword);

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: changePasswordAction,
    onSuccess: () => {
      form.reset();

      if (isForceChange) {
        toast.success(
          "Password changed successfully! You will be logged out for security."
        );
        setTimeout(() => {
          signOut({ callbackUrl: "/sign-in" });
          clearAllCookies();
        }, 2000);
      } else {
        toast.success(
          "Password changed successfully! You will be logged out for security."
        );
        setTimeout(() => {
          signOut({ callbackUrl: "/sign-in" });
          clearAllCookies();
        }, 2000);
      }
    },
    onError: (error: Error) => {
      
      toast.error(error.message || "An unexpected error occurred");
    },
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {isForceChange ? "Change Password Required" : "Change Password"}
        </h2>
        <p className="text-muted-foreground">
          {isForceChange
            ? "For security reasons, you must change your password before continuing. You will be logged out after changing your password."
            : "Update your password to keep your account secure. You will be logged out after changing your password."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Lock className="w-5 h-5" />
                {isForceChange ? "Required Password Update" : "Update Password"}
              </CardTitle>
              <CardDescription>
                {isForceChange
                  ? "You must change your password to continue. You will be logged out after changing your password."
                  : "Enter your current password and choose a new secure password. You will be logged out after changing your password."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Current Password */}
                  <FormField
                    control={form.control}
                    name="current_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter your current password"
                              {...field}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0 px-3 py-2 h-full hover:bg-transparent"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* New Password */}
                  <FormField
                    control={form.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter your new password"
                              {...field}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0 px-3 py-2 h-full hover:bg-transparent"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your new password"
                              {...field}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0 px-3 py-2 h-full hover:bg-transparent"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="w-full"
                  >
                    {changePasswordMutation.isPending
                      ? isForceChange
                        ? "Updating Password..."
                        : "Updating Password..."
                      : isForceChange
                      ? "Update Password & Continue"
                      : "Update Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Guidance */}
        <div className="space-y-6">
          {/* Password Strength */}
          {newPassword && (
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center text-sm">
                  <Shield className="w-4 h-4" />
                  Password Strength
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Strength:</span>
                    <Badge
                      variant="outline"
                      className={passwordStrength.color.replace(
                        "bg-",
                        "border-"
                      )}
                    >
                      {passwordStrength.label}
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Requirements:</h4>
                  <div className="space-y-1 text-sm">
                    <div
                      className={`flex items-center gap-2 ${
                        newPassword.length >= 8
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {newPassword.length >= 8 ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      At least 8 characters
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        /[a-z]/.test(newPassword)
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {/[a-z]/.test(newPassword) ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      One lowercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        /[A-Z]/.test(newPassword)
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {/[A-Z]/.test(newPassword) ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      One uppercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        /[0-9]/.test(newPassword)
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {/[0-9]/.test(newPassword) ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      One number
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        /[^A-Za-z0-9]/.test(newPassword)
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {/[^A-Za-z0-9]/.test(newPassword) ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      One special character
                    </div>
                  </div>
                </div>

                {/* Feedback and Suggestions */}
                {((passwordStrength.feedback?.length || 0) > 0 ||
                  (passwordStrength.suggestions?.length || 0) > 0) && (
                  <div className="pt-3 mt-3 border-t border-gray-200">
                    <h4 className="mb-2 text-sm font-medium">Suggestions:</h4>
                    <div className="space-y-1 text-sm">
                      {passwordStrength.feedback?.map((feedback, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-red-600">{feedback}</span>
                        </div>
                      ))}
                      {passwordStrength.suggestions?.map((suggestion, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <CheckCircle2 className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-600">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entropy Information */}
                {newPassword && (
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Entropy:</span>
                      <span className="font-medium">
                        {passwordStrength.entropy || 0} bits
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Security Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center text-sm">
                <Shield className="w-4 h-4" />
                Security Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 items-start">
                  <div className="flex-shrink-0 bg-blue-500 mt-2 rounded-full w-1.5 h-1.5" />
                  <span>
                    Use a unique password that you don&apos;t use elsewhere
                  </span>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="flex-shrink-0 bg-blue-500 mt-2 rounded-full w-1.5 h-1.5" />
                  <span>
                    Avoid personal information like birthdays or names
                  </span>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="flex-shrink-0 bg-blue-500 mt-2 rounded-full w-1.5 h-1.5" />
                  <span>
                    Consider using a password manager for better security
                  </span>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="flex-shrink-0 bg-blue-500 mt-2 rounded-full w-1.5 h-1.5" />
                  <span>
                    Change your password regularly, especially after security
                    incidents
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Important:</strong> After changing your password,
              you&apos;ll need to log in again on all your devices. Make sure to
              save your new password in a secure location.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
