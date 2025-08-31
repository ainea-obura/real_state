import z from "zod";

export const VendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  type: z.enum(["company", "individual"]).optional(),
  totalExpenses: z.union([z.number(), z.string()]).nullable(),
  expenseCount: z.number().nullable(),
});

export const VendorListResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(VendorSchema),
  }),
});

export type Vendor = z.infer<typeof VendorSchema>;
export type VendorListResponse = z.infer<typeof VendorListResponseSchema>;

export const mockVendors: Vendor[] = [
  {
    id: "1",
    name: "Acme Supplies",
    email: "contact@acme.com",
    phone: "+1234567890",
    totalExpenses: 12000,
    expenseCount: 8,
  },
  {
    id: "2",
    name: "CleanCo",
    email: "info@cleanco.com",
    phone: "+1234567891",
    totalExpenses: 5400,
    expenseCount: 3,
  },
  {
    id: "3",
    name: "FixIt Services",
    email: "support@fixit.com",
    phone: null,
    totalExpenses: 3200,
    expenseCount: 2,
  },
]; 