// This atom is NOT persisted. It is always reset when the modal is closed or page is refreshed.
import { TenantUnitItem } from "@/features/finance/scehmas/invoice";
import { atom } from "jotai";

export interface TenantUnitDraft {
  unitId: string;
  unitName: string;
  items: TenantUnitItem[];
  isChecked?: boolean;
}

// Match SubmitInvoiceRecipient from invoice.ts
export interface InvoiceRecipientDraft {
  id: string; // tenant or owner id
  type: "tenant" | "owner";
  name: string;
  units: TenantUnitDraft[];
}

export const invoiceDraftsAtom = atom<InvoiceRecipientDraft[]>([]);
