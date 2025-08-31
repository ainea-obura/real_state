import { z } from 'zod';

/**
 * Schema for individual ledger transaction
 */
export const LedgerTransactionSchema = z.object({
  date: z.string(),
  invoice: z.string(),
  rv: z.string(),
  method: z.string(),
  debit: z.string(),
  credit: z.string(),
  balance: z.string(),
  description: z.string(),
  payer_name: z.string(),
  payer_email: z.string(),
  tenant_name: z.string(),
  tenant_email: z.string(),
  outstanding: z.string(),
});

/**
 * Schema for ledger response data
 */
export const LedgerResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(LedgerTransactionSchema),
  }),
});

/**
 * TypeScript types derived from schemas
 */
export type LedgerTransaction = z.infer<typeof LedgerTransactionSchema>;
export type LedgerResponse = z.infer<typeof LedgerResponseSchema>;

/**
 * Schema for ledger request parameters
 */
export const LedgerRequestSchema = z.object({
  unit_id: z.string().uuid(),
});

export type LedgerRequest = z.infer<typeof LedgerRequestSchema>;

/**
 * Schema for unit information used in ledger modal
 */
export const UnitInfoSchema = z.object({
  tenantName: z.string(),
  unit: z.string(),
  projectName: z.string(),
});

export type UnitInfo = z.infer<typeof UnitInfoSchema>;

/**
 * Schema for ledger modal props
 */
export const ViewLedgerModalPropsSchema = z.object({
  open: z.boolean(),
  onClose: z.function().returns(z.void()),
  unit: UnitInfoSchema,
});

export type ViewLedgerModalProps = z.infer<typeof ViewLedgerModalPropsSchema>;
