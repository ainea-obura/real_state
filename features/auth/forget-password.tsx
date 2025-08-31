"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVerificationRedirect } from "@/lib/verification";
import { requestPasswordResetOtp } from "@/actions/users/auth";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const forgetPasswordSchema = z.object({
  email: z.string().email(),
});
type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema>;
const ForgetPassword = () => {
  const form = useForm<forgetPasswordSchemaType>({
    resolver: zodResolver(forgetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (data: forgetPasswordSchemaType) => {
      return await requestPasswordResetOtp(data.email);
    },
    onError(error: any) {
      toast.error(error?.message || "Failed to send OTP");
    },
    onSuccess: async (result, data) => {
      if (!result.error) {
        toast.error(result.message);
        return;
      }
      console.log("result", result);
      // Generate secure token and redirect
      const redirect = await createVerificationRedirect(
        "password-reset-otp",
        data.email,
        "/verify-password-reset-otp"
      );
      console.log("redirect", redirect);
      router.replace(
        `${redirect.redirectUrl}&email=${encodeURIComponent(data.email)}`
      );
    },
  });

  const onSubmit = (data: forgetPasswordSchemaType) => {
    mutation.mutate(data);
  };
  return (
    <div className="w-full h-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <Input {...field} placeholder="your email" />
            )}
          />
          <div className="mt-5 w-full">
            <Button size={"lg"} className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
export default ForgetPassword;
