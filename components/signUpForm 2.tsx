"use client";
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { sigUpAction } from '@/actions/users/signUpActions';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { useSetRetryTimer } from '@/hooks/auth/useSetRetryTimer';
import { createVerificationRedirect } from '@/lib/verification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { PasswordInput } from './ui/password-input';

// Initialize zxcvbn options with proper language support
const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
};
zxcvbnOptions.setOptions(options);

const signUpFormSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email({ message: "Invalid email address" })
      .trim(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .refine(
        (val) => {
          if (!val) return false;
          const result = zxcvbn(val);
          return result.score >= 3;
        },
        {
          message:
            "Password is too weak. Include numbers, symbols, and mixed case letters.",
        }
      ),
    confirm_password: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export default function SignUpForm() {
  const router = useRouter();
  const { status } = useSession();
  const setRetryTimer = useSetRetryTimer();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirm_password: "",
    },
    mode: "onChange", // Enable real-time validation
  });

  const { mutate: signUp, isPending } = useMutation({
    mutationFn: async (data: SignUpFormValues) => {
      const res = await sigUpAction(data);
      if (res.error) throw res;
      return res;
    },
    onSuccess: async (data) => {
      // This won't be called since server always returns error: true
      if(data.message.includes("Signup is disabled")){
        toast.error(data.message, {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        return;
      }
      toast.success(data.message, {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <CheckCircle size={20} className="text-white" />,
      });
    },
    onError: async (error: {
      error: boolean;
      email_verified: boolean;
      message: string;
      email: string;
      next_request_in?: number;
      page?: string;
      retry_after?: number;
    }) => {
      // Case 1: Email verification needed
      if (!error.email_verified) {
        // Set verification cookie
        const callbackUrl =
          typeof window !== "undefined" ? window.location.pathname : "/";
        const result = await createVerificationRedirect(
          "email",
          error.email,
          "/verify-email",
          callbackUrl
        );

        // Show success message about email verification
        setTimeout(() => {
          toast.success(error.message, {
            className: "bg-green-600 text-white rounded-lg shadow-lg",
            icon: <CheckCircle size={20} className="text-white" />,
          });
        }, 2000);

        // If there's a retry timer, set it
        if (error.next_request_in || error.retry_after) {
          const seconds = error.next_request_in || error.retry_after;
          await setRetryTimer("email", error.email, seconds || 0);
        }

        // Always redirect to the secure token-based URL
        router.replace(result.redirectUrl);
        return;
      }

      // Case 2: General error
      toast.error(error.message, {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
    },
  });

  const onSubmit: SubmitHandler<SignUpFormValues> = (values) => {
    signUp(values);
  };

  // Watch form fields for live validation
  const email = form.watch("email");
  const password = form.watch("password");
  const confirmPassword = form.watch("confirm_password");

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email" className="!font-medium">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    placeholder="Enter your email"
                    type="email"
                    autoComplete="email"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <div className="min-h-[16px]">
                  <FormMessage />
                  {email && !form.formState.errors.email && (
                    <p className="text-xs text-green-500">Valid email format</p>
                  )}
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <div className="min-h-[16px]">
                  <FormMessage />
                  {password && !form.formState.errors.password && (
                    <p className="text-xs text-green-500">
                      Password is strong enough
                    </p>
                  )}
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="confirmPassword">
                  Confirm Password
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <div className="min-h-[16px]">
                  <FormMessage />
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-500">Passwords match</p>
                  )}
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-5 w-full h-10 cursor-pointer"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? "Creating Account..." : "Create New Account"}
          </Button>
        </form>
      </Form>

      <div>
        <p className="flex justify-center items-center mt-4">
          Already have an account?&nbsp;
          <Link
            href={isPending ? "#" : "/sign-in"}
            className={`font-medium text-primary cursor-pointer ${
              isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-disabled={isPending}
            tabIndex={isPending ? -1 : undefined}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
