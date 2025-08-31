import { useCallback, useRef, useState } from "react";
import { searchRecipients } from "@/actions/finance/invoice";
import type { Recipient } from "@/features/finance/scehmas/invoice";

export function useRecipientSearch(recipientType: string, query: string) {
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!recipientType || !q || q.length < 3) {
      setRecipients([]);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchRecipients({ type: recipientType, q });
        setRecipients(data.results);
      } catch (err) {
        setError("Failed to fetch recipients");
        setRecipients([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [recipientType]);

  return { recipients, loading, error, search };
}
