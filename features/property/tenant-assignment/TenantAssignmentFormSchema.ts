import { z } from "zod";

export const TenantAssignmentFormSchema = z.object({
  node: z.string().uuid({ message: "Unit is required" }),
  tenant_user: z.string().uuid({ message: "Tenant is required" }),
  contract_start: z.string().min(1, "Start date is required"),
  contract_end: z.string().min(1, "End date is required"),
  rent_amount: z.string().min(1, "Rent amount is required"),
  currency: z.string().min(1, "Currency is required"),
});

export type TenantAssignmentFormValues = z.infer<typeof TenantAssignmentFormSchema>; 