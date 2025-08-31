// components/VerificationForm.tsx
"use client";

import { AlertTriangle, MailCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ZodType } from 'zod';

import { resendOTPAction } from '@/actions/users/auth';
import { useRemainingTimer } from '@/hooks/auth/useRemainingTimer';
import { useSetRetryTimer } from '@/hooks/auth/useSetRetryTimer';
import { APIResendResponse, APIWaitPeriod } from '@/types/api/ApiResponseError';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

export interface FormValues {
  otp_code: string;
  email: string;
}

interface VerificationFormProps {
  schema: ZodType<any>;
  onSubmit: (data: FormValues) => void;
  isLoading: boolean;
  type: "otp" | "email" | "password-reset";
  email: string; // Add email as a required prop
  resendOtp?: (email: string) => Promise<any>; // Optional custom resend OTP function
}

const VerificationForm: React.FC<VerificationFormProps> = ({
  schema,
  onSubmit,
  isLoading,
  type,
  email, // Receive email as prop
  resendOtp,
}: VerificationFormProps) => {
  const params = useSearchParams();
  const router = useRouter();
  const setRetryTimer = useSetRetryTimer();
  const { formattedTime, remaining, refresh } = useRemainingTimer(type, email);

  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      otp_code: "",
      email,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { mutate } = useMutation({
    mutationFn: async ({
      email,
      type,
    }: {
      email: string;
      type: "verify_otp" | "verify_email";
    }) => {
      if (resendOtp) {
        return await resendOtp(email);
      }
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

  const handleSubmit: SubmitHandler<FormValues> = (data) => {
    if (!email) {
      toast.error("Email is not valid", {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
      return;
    }
    onSubmit(data);
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
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
                    {...field}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      // Strip any non-digit
                      const input = e.currentTarget;
                      input.value = input.value.replace(/\D/g, "");
                      field.onChange(input.value);
                    }}
                  >
                    <InputOTPGroup className="flex gap-8 justify-center items-center w-full">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          inputMode="numeric"
                          className="w-12 h-12 text-center rounded-md border"
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
              disabled={
                isLoading ||
                !form.watch("otp_code") ||
                form.watch("otp_code").length !== 6
              }
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
