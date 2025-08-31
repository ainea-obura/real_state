"use client";

import { AlertTriangle, CheckCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { verifyPasswordResetOtp } from "@/actions/users/resetPassword";
import VerificationForm, { FormValues } from "@/components/verify2FAForm";
import { validateVerificationParamsAction, createVerificationRedirect } from "@/lib/verification";
import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { requestPasswordResetOtp } from "@/actions/users/auth";

const verifyPasswordResetOtpSchema = z.object({
  otp_code: z
    .string()
    .length(6, { message: "OTP must be exactly 6 digits" })
    .regex(/^\d{6}$/, { message: "OTP must contain only digits" }),
  email: z.string().email({ message: "Invalid email address" }),
});

const VerifyPasswordResetOtp = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Validate email parameter and prevent direct access
  useEffect(() => {
    const validateAccess = async () => {
      const emailParam = searchParams.get("email");

      if (!emailParam) {
        toast.error("Invalid access. Please request a password reset first.", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        router.replace("/forget-password");
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailParam)) {
        toast.error(
          "Invalid email format. Please request a password reset again.",
          {
            className: "bg-red-600 text-white rounded-lg shadow-lg",
            icon: <AlertTriangle size={20} className="text-white" />,
          }
        );
        router.replace("/forget-password");
        return;
      }

      setEmail(emailParam);
      setIsValidating(false);
    };

    validateAccess();
  }, [searchParams, router]);

  // Redirect authenticated users
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const { mutate, isPending } = useReactQueryMutation({
    mutationFn: async (data: FormValues) => {
      if (!email) {
        toast.error("Missing email address. Please try again.", {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        });
        return { error: true, message: "Missing email address." };
      }
      setIsRedirecting(true);
      const res = await verifyPasswordResetOtp(email, data.otp_code);
      return res;
    },
    onSuccess: async (res) => {
      if (res.error) {
        toast.error(
          res.message || "OTP verification failed. Please try again.",
          {
            className: "bg-red-600 text-white rounded-lg shadow-lg",
            icon: <AlertTriangle size={20} className="text-white" />,
          }
        );
        setIsRedirecting(false);
        return;
      }
      toast.success(res?.message || "OTP Verified Successfully", {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <CheckCheck size={20} className="text-white" />,
      });
      
        const result = await createVerificationRedirect(
          "password-reset",
          email!,
          "/reset-password"
        );
        router.replace(result.redirectUrl);
  
    },
  });

  // Resend OTP mutation for password reset
  const resendOtpMutation = useReactQueryMutation({
    mutationFn: async (email: string) => {
      const res = await requestPasswordResetOtp(email);
      return res;
    },
    onSuccess: (res) => {
      toast.success(res.message || "OTP sent successfully", {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <CheckCheck size={20} className="text-white" />,
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to resend OTP", {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    mutate(data);
  };

  if (isValidating) {
    return (
      <div className="w-full">
        <div className="flex flex-col justify-center items-center min-h-[200px] text-center">
          <div className="mb-4 w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
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
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Invalid Verification Link
          </h3>
          <p className="mb-4 text-gray-600">
            This verification link is invalid or has expired. Please try
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
    <div className="w-full">
      <VerificationForm
        schema={verifyPasswordResetOtpSchema}
        onSubmit={onSubmit}
        isLoading={isPending || isRedirecting || resendOtpMutation.isPending}
        type="password-reset"
        email={email || ""}
        resendOtp={async (email) => {
          return await resendOtpMutation.mutateAsync(email);
        }}
      />
    </div>
  );
};

export default VerifyPasswordResetOtp;
