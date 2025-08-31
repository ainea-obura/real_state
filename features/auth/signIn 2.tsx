"use client";
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { loginAction } from '@/actions/users/auth';
import { Button } from '@/components/ui/button';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSetRetryTimer } from '@/hooks/auth/useSetRetryTimer';
import { createVerificationRedirect } from '@/lib/verification';
import {
    APIAuth2FAError, APIAuthEmailVerifiedError, APIWaitPeriod,
} from '@/types/api/ApiResponseError';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

export type SignInFormSchemaType = z.infer<typeof SignInFormSchema>;
export const SignInFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const SignInComponent = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setRetryTimer = useSetRetryTimer();
  const { data: session, status } = useSession();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  // Handle redirect after successful authentication
  useEffect(() => {
    if (status === "authenticated") {
      const error = searchParams.get("error");
      if (error && error.includes("verification link")) {
        // User came from expired verification link, redirect to dashboard
        router.replace("/");
      } else {
        // Normal redirect to callback URL
        router.replace(callbackUrl);
      }
    }
  }, [status, router, callbackUrl, searchParams]);

  const form = useForm<SignInFormSchemaType>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SignInFormSchemaType) => {
      const res = await loginAction(data.email, data.password);
      if (res.error) throw res;
      return res;
    },
    async onSuccess() {
      console.log(
        "[SignIn] Login successful - redirect handled by session effect"
      );
    },
    async onError(
      error: APIAuth2FAError | APIAuthEmailVerifiedError | Error | APIWaitPeriod
    ) {
      const msg = error.message;

      try {
        // Handle wait period scenario first (retry after) - redirect regardless of page type
        if ("page" in error || error instanceof APIWaitPeriod) {
          const { retry_after: seconds, page, email } = error;
          const verificationType = page === "Verify OTP" ? "otp" : "email";
          const route = page === "Verify OTP" ? "/verify-otp" : "/verify-email";

          console.log(
            `[SignIn] Wait period required for ${verificationType}, setting retry timer...`
          );

          // Set retry timer and create verification URL
          try {
            await setRetryTimer(verificationType, email, seconds);
          } catch (timerError) {
            console.warn("[SignIn] Failed to set retry timer:", timerError);
          }

          const result = await createVerificationRedirect(
            verificationType,
            email,
            route,
            callbackUrl
          );

          console.log(
            `[SignIn] Redirecting with timer to: ${result.redirectUrl}`
          );
          setIsSubmitting(false);
          router.replace(result.redirectUrl);
          return;
        }

        // Handle email verification required scenario (email not verified)
        if ("email_verified" in error && error.email_verified === false) {
          console.log(
            "[SignIn] Email verification required, creating verification URL..."
          );

          // Set retry timer if provided
          if ("next_request_in" in error && error.next_request_in) {
            try {
              await setRetryTimer(
                "email",
                error.email!,
                Number(error.next_request_in)
              );
            } catch (timerError) {
              console.warn("[SignIn] Failed to set retry timer:", timerError);
            }
          }

          const result = await createVerificationRedirect(
            "email",
            error.email!,
            "/verify-email",
            callbackUrl
          );

          console.log(`[SignIn] Redirecting to: ${result.redirectUrl}`);
          setIsSubmitting(false);
          router.replace(result.redirectUrl);
          return;
        }

        // Handle OTP required scenario (email is verified, need OTP)
        if ("otp_required" in error && error.otp_required) {
          console.log("[SignIn] OTP required, creating verification URL...");

          // Set retry timer if provided
          if ("next_request_in" in error && error.next_request_in) {
            try {
              await setRetryTimer(
                "otp",
                error.email!,
                Number(error.next_request_in)
              );
            } catch (timerError) {
              console.warn("[SignIn] Failed to set retry timer:", timerError);
            }
          }

          const result = await createVerificationRedirect(
            "otp",
            error.email!,
            "/verify-otp",
            callbackUrl
          );

          console.log(`[SignIn] Redirecting to: ${result.redirectUrl}`);
          setIsSubmitting(false);
          router.replace(result.redirectUrl);
          return;
        }

        // Handle other errors
        setIsSubmitting(false);
        toast.error(msg, {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
      } catch (unexpectedError) {
        console.error(
          "[SignIn] Unexpected error in authentication flow:",
          unexpectedError
        );
        setIsSubmitting(false);
      }
    },
  });

  const onSubmit = (data: SignInFormSchemaType) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-col items-center mt-6 w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 w-full"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    className="block px-3 py-2 mt-1 w-full h-11 rounded-md border border-gray-300 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    placeholder="Enter your email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={isSubmitting}
                      className="block px-3 py-2 pr-10 mt-1 w-full h-11 rounded-md border border-gray-300 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      placeholder="Enter your password"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 z-10 text-gray-400 -translate-y-1/2 focus:outline-none hover:text-primary"
                      style={{ height: "1.5rem", width: "1.5rem" }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Forgot password link */}
          <div className="flex justify-end mb-2 w-full">
            <Link
              href="/forget-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex justify-center px-4 py-2 w-full h-11 text-sm font-medium text-white rounded-md border border-transparent shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </Form>
      <div className="flex justify-center items-center mt-4">
        <span className="text-sm text-gray-600">
          Don&apos;t have an account?
        </span>
        <Link
          href="/sign-up"
          className="ml-2 text-sm font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default SignInComponent;
