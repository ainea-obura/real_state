"use client";
import { AlertTriangle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import Verify2FAForm from '@/components/verify2FAForm';
import { validateVerificationParamsAction } from '@/lib/verification';
import { useMutation } from '@tanstack/react-query';

const formSchema = z.object({
  otp_code: z.string().min(1, { message: "Provide Valid OTP" }),
  email: z.string().email(),
});
type formSchemaType = z.infer<typeof formSchema>;

const VerifyOTP = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        const validation = await validateVerificationParamsAction(token, "otp");

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
        console.error("Token validation error:", error);
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

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ email, otp_code }: formSchemaType) => {
      const { signIn } = await import("next-auth/react");
      const res = await signIn("otp", {
        redirect: false,
        email,
        otp: otp_code,
      });
      if (res?.error) {
        throw new Error(res.error);
      }
      return res;
    },
    onSuccess: async () => {
      setIsRedirecting(true);
      setTimeout(() => {
        window.location.href = callbackUrl;
      }, 500);
    },
    onError: (error) => {
      toast.error(
        error.message || "OTP verification failed. Please try again.",
        {
          className: "bg-red-600 text-white rounded-lg shadow-lg",
          icon: <AlertTriangle size={20} className="text-white" />,
        }
      );
      setIsRedirecting(false);
    },
  });

  const onSubmit = (data: formSchemaType) => {
    mutate(data);
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center mt-6 w-full">
        <div className="flex flex-col justify-center items-center min-h-[200px] text-center">
          <div className="mb-4 border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
          <p className="text-gray-600">Validating verification link...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center mt-6 w-full">
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
    <div className="flex flex-col items-center mt-6 w-full">
      <Verify2FAForm
        schema={formSchema}
        onSubmit={onSubmit}
        isLoading={isPending || isRedirecting}
        type="otp"
        email={email || ""}
      />
    </div>
  );
};

export default VerifyOTP;
