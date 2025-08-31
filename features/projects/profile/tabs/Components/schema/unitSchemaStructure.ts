import { z } from 'zod';

export const unitSchemaStructure = z.object({
  floor: z.string().uuid(),
  block: z.string().uuid(),
  apartment: z
    .object({
      management_mode: z.enum(["FULL_MANAGEMENT", "SERVICE_ONLY"]),
      management_status: z.enum(["for_rent", "for_sale"]),
      identifier: z.string().max(50),
      size: z.string().max(255),
      rental_price: z.number().optional(),
      sale_price: z.number().optional(),
      service_charge: z.string().optional().nullable(),
      status: z.enum(["available", "rented", "sold"]),
      description: z.string().optional(),
      currency: z.string().uuid().optional(), // Add currency as optional
      unit_type: z
        .enum([
          "1 Bedroom",
          "2 Bedroom",
          "3 Bedroom",
          "4 Bedroom",
          "5 Bedroom",
          "6 Bedroom",
        ])
        .optional(),
    })
    .refine(
      (data) => {
        // If management_mode is FULL_MANAGEMENT, validate based on management_status
        if (data.management_mode === "FULL_MANAGEMENT") {
          if (data.management_status === "for_rent") {
            // For rent: rental_price, currency, and type are required
            return (
              data.rental_price !== undefined &&
              data.rental_price > 0 &&
              !!data.currency &&
              !!data.unit_type
            );
          } else if (data.management_status === "for_sale") {
            // For sale: sale_price is optional, currency and type are required
            return !!data.currency && !!data.unit_type;
          }
        }
        return true;
      },
      {
        message: "Currency and type are required for full management mode",
        path: ["rental_price", "sale_price", "currency", "type"],
      }
    ),
});
