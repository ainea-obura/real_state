"use client";

import { AlertTriangle, CheckCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { verifyEmail } from '@/actions/users/auth';
import VerificationForm, { FormValues } from '@/components/verify2FAForm';
import { validateVerificationParamsAction } from '@/lib/verification';
import { useMutation } from '@tanstack/react-query';

const verifyEmailFormSchema = z.object({
  otp_code: z
    .string()
    .length(6, { message: "OTP must be exactly 6 digits" })
    .regex(/^\d{6}$/, { message: "OTP must contain only digits" }),
  email: z.string().email({ message: "Invalid email address" }),
});

const VerifyEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [isValidating, setIsValidating] = useState(true);

  // Validate token and extract email
  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        toast.error("Invalid verification link", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        router.replace("/sign-in");
        return;
      }

      try {
        const validation = await validateVerificationParamsAction(
          token,
          "email"
        );

        if (!validation.valid) {
          toast.error(validation.error || "Invalid verification link", {
            className: "bg-red-600 text-white rounded-lg shadow-lg",
            icon: <AlertTriangle size={20} className="text-white" />,
          });
          router.replace("/sign-in");
          return;
        }

        setEmail(validation.email || null);
        setCallbackUrl(validation.callbackUrl || "/");
      } catch (error) {
        toast.error("Invalid verification link", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        router.replace("/sign-in");
        return;
      }

      setIsValidating(false);
    };

    validateToken();
  }, [searchParams, router]);

  // Redirect authenticated users
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!email) {
        toast.error("Missing email address. Please try signing in again.", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        return;
      }
      setIsRedirecting(true);
      const res = await verifyEmail(email, data.otp_code);
      if (res.error) {
        throw res;
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Email Verified Successfully", {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <CheckCheck size={20} className="text-white" />,
      });
      setTimeout(() => {
        router.replace("/sign-in");
      }, 2000);
    },
    onError: (err) => {
      toast.error(
        err.message || "Email verification failed. Please try again.",
        {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        }
      );
      setIsRedirecting(false);
    },
  });

  const onSubmit = (data: FormValues) => {
    mutate(data);
  };

  if (isValidating) {
    return (
      <div className="w-full">
        <div className="flex flex-col justify-center items-center min-h-[200px] text-center">
          <div className="mb-4 border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
          <p className="text-gray-600">Validating verification link...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="w-full">
        <div className="flex flex-col justify-center items-center min-h-[200px] text-center">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h3 className="mb-2 font-semibold text-gray-900 text-lg">
            Invalid Verification Link
          </h3>
          <p className="mb-4 text-gray-600">
            This verification link is invalid or has expired. Please try signing
            in again.
          </p>
          <button
            onClick={() => router.replace("/sign-in")}
            className="bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg text-white transition-colors"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <VerificationForm
        schema={verifyEmailFormSchema}
        onSubmit={onSubmit}
        isLoading={isPending || isRedirecting}
        type="email"
        email={email || ""}
      />
    </div>
  );
};

export default VerifyEmail;
