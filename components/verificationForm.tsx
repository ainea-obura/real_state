// components/VerificationForm.tsx
"use client";

import { AlertTriangle, MailCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { resendOTPAction } from '@/actions/users/auth';
import { useRemainingTimer } from '@/hooks/auth/useRemainingTimer';
import { useSetRetryTimer } from '@/hooks/auth/useSetRetryTimer';
import { APIResendResponse, APIWaitPeriod } from '@/types/api/ApiResponseError';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

interface FormValues {
  otp_code: string;
  email: string;
}

interface VerificationFormProps {
  schema: z.ZodSchema<FormValues>;
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
  type?: "otp" | "email";
  email: string; // Add email as a required prop
}

const VerificationForm = ({
  schema,
  onSubmit,
  isLoading = false,
  type = "otp",
  email, // Receive email as prop
}: VerificationFormProps) => {
  const params = useSearchParams();
  const setRetryTimer = useSetRetryTimer();
  const { formattedTime, remaining, refresh } = useRemainingTimer(type, email);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      otp_code: "",
      email,
    },
    mode: "onChange", // Changed to onChange for better validation
  });

  const { mutate } = useMutation({
    mutationFn: async ({
      email,
      type,
    }: {
      email: string;
      type: "verify_otp" | "verify_email";
    }) => {
      const res = await resendOTPAction(email, type);
      if (res.error) {
        throw res;
      }
      return res;
    },

    onError: async (err: Error | APIWaitPeriod | APIResendResponse) => {
      if (err.message.startsWith("OTP sent successfully")) {
        const { next_request_in, email } = err as APIResendResponse;
        toast.success(err.message, {
          className: "pg-primary text-white rounded-lg shadow-lg",
          icon: <MailCheck size={20} className="text-primary-foreground" />,
        });
        await setRetryTimer("otp", email, next_request_in);
        refresh();
        return;
      }

      if (err.message.startsWith("Please wait")) {
        const { retry_after, email } = err as APIWaitPeriod;
        await setRetryTimer("otp", email, retry_after);
        refresh(); // to update the timer
        return;
      }

      toast.error(err.message, {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
    },
  });

  const handleSubmit: SubmitHandler<FormValues> = async (data) => {
    onSubmit(data);
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full"
          noValidate
        >
          <FormField
            control={form.control}
            name="otp_code"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                    }}
                  >
                    <InputOTPGroup className="flex justify-center items-center gap-8 w-full">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          inputMode="numeric"
                          className="border rounded-md w-12 h-12 text-center"
                          onInput={(e: React.FormEvent<HTMLInputElement>) => {
                            const input = e.currentTarget;
                            input.value = input.value.replace(/\D/g, "");
                          }}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end items-end mt-4 w-full">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                mutate({
                  email,
                  type: type === "otp" ? "verify_otp" : "verify_email",
                });
              }}
              disabled={remaining > 0}
              className="cursor-pointer"
            >
              {remaining > 0 ? `Resend in ${formattedTime}` : "Resend code"}
            </Button>
          </div>

          <div className="flex justify-between items-center mt-6">
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="w-full h-11 cursor-pointer"
            >
              {isLoading ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default VerificationForm;
