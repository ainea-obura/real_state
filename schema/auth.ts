import { z } from 'zod';

export const SignInFormSchema = z.object({
  email: z.string().email({ message: "Invalid Email Address" }),
  password: z
    .string()
    .min(6, { message: "Your password Must Be at Least 6 Characters" }),
});

export type SignInFormSchemaType = z.infer<typeof SignInFormSchema>;
